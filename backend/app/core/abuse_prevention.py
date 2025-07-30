"""
Abuse prevention and detection system
"""
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from app.models.file import File
from app.models.user import User, UserTier
from app.core.config import settings
import hashlib
import ipaddress


class AbuseDetector:
    """Detect and prevent various abuse patterns"""
    
    # Thresholds for abuse detection
    THRESHOLDS = {
        "max_storage_days": {  # Max storage * days product
            UserTier.FREE: 1 * 24,      # 1GB * 1 day = 1 GB-day
            UserTier.PRO: 300 * 7,      # 300GB * 7 days = 2100 GB-days
            UserTier.MAX: 1024 * 20,    # 1TB * 20 days = 20480 GB-days
        },
        # No bandwidth limits needed with R2's free egress!
        # Keeping this for analytics only
        "bandwidth_multiplier": {  
            UserTier.FREE: float('inf'),    # Unlimited
            UserTier.PRO: float('inf'),     # Unlimited
            UserTier.MAX: float('inf'),     # Unlimited
        },
        "unique_downloaders_ratio": {  # Min ratio of unique downloaders to total downloads
            UserTier.FREE: 0.3,    # At least 30% unique IPs
            UserTier.PRO: 0.1,     # At least 10% unique IPs
            UserTier.MAX: 0.05,    # At least 5% unique IPs
        },
        "max_file_count": {  # Maximum number of active files
            UserTier.FREE: 50,
            UserTier.PRO: 500,
            UserTier.MAX: 5000,
        }
    }
    
    @classmethod
    async def check_storage_abuse(
        cls, 
        user: User, 
        db: AsyncSession
    ) -> Tuple[bool, Optional[str]]:
        """Check if user is abusing storage limits"""
        
        # Calculate storage-days used in the last 30 days
        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
        
        result = await db.execute(
            select(
                func.sum(
                    File.file_size * 
                    func.extract('epoch', func.least(File.expires_at, func.now()) - File.created_at) / 86400
                )
            )
            .where(File.user_id == user.id)
            .where(File.created_at > thirty_days_ago)
            .where(File.deleted == False)
        )
        
        storage_days = result.scalar() or 0
        storage_gb_days = storage_days / (1024 * 1024 * 1024)
        
        threshold = cls.THRESHOLDS["max_storage_days"][user.tier]
        
        if storage_gb_days > threshold:
            return False, f"Storage abuse detected: {storage_gb_days:.1f} GB-days used (limit: {threshold})"
        
        return True, None
    
    @classmethod
    async def check_bandwidth_abuse(
        cls,
        file: File,
        user_tier: UserTier
    ) -> Tuple[bool, Optional[str]]:
        """Check if a file is consuming excessive bandwidth"""
        
        if not file.bandwidth_used:
            return True, None
            
        multiplier = file.bandwidth_used / file.file_size
        threshold = cls.THRESHOLDS["bandwidth_multiplier"][user_tier]
        
        if multiplier > threshold:
            return False, f"Bandwidth abuse: File downloaded {multiplier:.0f}x its size (limit: {threshold}x)"
        
        return True, None
    
    @classmethod
    async def check_download_pattern_abuse(
        cls,
        file: File,
        user_tier: UserTier
    ) -> Tuple[bool, Optional[str]]:
        """Check for suspicious download patterns (bot downloads)"""
        
        if file.download_count < 10:
            return True, None  # Too few downloads to analyze
        
        if file.unique_downloaders == 0:
            return False, "Suspicious pattern: No unique downloaders tracked"
        
        unique_ratio = file.unique_downloaders / file.download_count
        threshold = cls.THRESHOLDS["unique_downloaders_ratio"][user_tier]
        
        if unique_ratio < threshold:
            return False, f"Suspicious download pattern: Only {unique_ratio:.1%} unique IPs (minimum: {threshold:.0%})"
        
        return True, None
    
    @classmethod
    async def check_file_count_abuse(
        cls,
        user: User,
        db: AsyncSession
    ) -> Tuple[bool, Optional[str]]:
        """Check if user has too many active files"""
        
        result = await db.execute(
            select(func.count(File.id))
            .where(File.user_id == user.id)
            .where(File.expires_at > datetime.now(timezone.utc))
            .where(File.deleted == False)
        )
        
        file_count = result.scalar() or 0
        threshold = cls.THRESHOLDS["max_file_count"][user.tier]
        
        if file_count >= threshold:
            return False, f"Too many active files: {file_count} (limit: {threshold})"
        
        return True, None
    
    @classmethod
    async def check_rapid_upload_pattern(
        cls,
        user: User,
        db: AsyncSession
    ) -> Tuple[bool, Optional[str]]:
        """Check for rapid automated uploads"""
        
        # Check uploads in the last hour
        one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
        
        result = await db.execute(
            select(func.count(File.id))
            .where(File.user_id == user.id)
            .where(File.created_at > one_hour_ago)
        )
        
        hourly_uploads = result.scalar() or 0
        
        # Thresholds based on tier
        hourly_limits = {
            UserTier.FREE: 5,
            UserTier.PRO: 20,
            UserTier.MAX: 50
        }
        
        limit = hourly_limits[user.tier]
        
        if hourly_uploads > limit:
            return False, f"Too many uploads in the last hour: {hourly_uploads} (limit: {limit})"
        
        return True, None
    
    @classmethod
    def hash_ip(cls, ip: str) -> str:
        """Hash IP address for privacy-preserving tracking"""
        return hashlib.sha256(f"{ip}{settings.SECRET_KEY}".encode()).hexdigest()[:16]
    
    @classmethod
    async def record_download(
        cls,
        file: File,
        ip_address: str,
        db: AsyncSession
    ) -> None:
        """Record download for abuse tracking"""
        
        # Update bandwidth used
        file.bandwidth_used = (file.bandwidth_used or 0) + file.file_size
        file.last_download_at = datetime.now(timezone.utc)
        
        # Track unique IPs (simplified - in production use Redis set)
        # This is a simplified version - you'd want to use Redis for proper unique tracking
        file.download_count += 1
        
        await db.commit()
    
    @classmethod
    async def check_ip_abuse(
        cls,
        ip_address: str,
        db: AsyncSession
    ) -> Tuple[bool, Optional[str]]:
        """Check if IP is abusing the service"""
        
        # Check uploads from this IP in last 24 hours
        twenty_four_hours_ago = datetime.now(timezone.utc) - timedelta(hours=24)
        
        result = await db.execute(
            select(func.count(File.id))
            .where(File.upload_ip == ip_address)
            .where(File.created_at > twenty_four_hours_ago)
        )
        
        ip_uploads = result.scalar() or 0
        
        if ip_uploads > 100:  # More than 100 uploads per day from same IP
            return False, f"IP abuse: {ip_uploads} uploads in 24 hours"
        
        return True, None
    
    @classmethod
    async def calculate_abuse_score(
        cls,
        user: User,
        db: AsyncSession
    ) -> Dict[str, any]:
        """Calculate overall abuse score for a user"""
        
        scores = {
            "storage_abuse": False,
            "bandwidth_abuse": False,
            "pattern_abuse": False,
            "file_count_abuse": False,
            "rapid_upload": False,
            "overall_score": 0,
            "recommendations": []
        }
        
        # Check each abuse type
        storage_ok, storage_msg = await cls.check_storage_abuse(user, db)
        if not storage_ok:
            scores["storage_abuse"] = True
            scores["overall_score"] += 30
            scores["recommendations"].append(storage_msg)
        
        file_count_ok, file_count_msg = await cls.check_file_count_abuse(user, db)
        if not file_count_ok:
            scores["file_count_abuse"] = True
            scores["overall_score"] += 20
            scores["recommendations"].append(file_count_msg)
        
        rapid_ok, rapid_msg = await cls.check_rapid_upload_pattern(user, db)
        if not rapid_ok:
            scores["rapid_upload"] = True
            scores["overall_score"] += 25
            scores["recommendations"].append(rapid_msg)
        
        # Check bandwidth abuse on user's files
        result = await db.execute(
            select(File)
            .where(File.user_id == user.id)
            .where(File.bandwidth_used > File.file_size * 10)  # Basic check
            .limit(5)
        )
        
        bandwidth_abuse_files = result.scalars().all()
        if bandwidth_abuse_files:
            scores["bandwidth_abuse"] = True
            scores["overall_score"] += 25
            scores["recommendations"].append(f"{len(bandwidth_abuse_files)} files with excessive bandwidth usage")
        
        return scores


class CostCalculator:
    """Calculate actual costs for usage patterns"""
    
    # R2 pricing (approximate)
    R2_STORAGE_PER_GB_MONTH = 0.015  # $0.015 per GB per month
    R2_OPERATIONS_PER_1000 = 0.0036  # $0.0036 per 1000 operations
    
    @classmethod
    def calculate_storage_cost(cls, size_bytes: int, days: int) -> float:
        """Calculate storage cost for given size and duration"""
        gb = size_bytes / (1024 * 1024 * 1024)
        months = days / 30
        return gb * months * cls.R2_STORAGE_PER_GB_MONTH
    
    @classmethod
    def calculate_operation_cost(cls, operations: int) -> float:
        """Calculate operation cost"""
        return (operations / 1000) * cls.R2_OPERATIONS_PER_1000
    
    @classmethod
    async def calculate_user_cost(
        cls,
        user: User,
        db: AsyncSession
    ) -> Dict[str, float]:
        """Calculate actual infrastructure cost for a user"""
        
        # Get user's files from last 30 days
        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
        
        result = await db.execute(
            select(
                func.sum(File.file_size),
                func.sum(File.download_count),
                func.count(File.id)
            )
            .where(File.user_id == user.id)
            .where(File.created_at > thirty_days_ago)
        )
        
        total_size, total_downloads, file_count = result.one()
        total_size = total_size or 0
        total_downloads = total_downloads or 0
        file_count = file_count or 0
        
        # Calculate average storage duration
        result = await db.execute(
            select(
                func.avg(
                    func.extract('epoch', func.least(File.expires_at, func.now()) - File.created_at) / 86400
                )
            )
            .where(File.user_id == user.id)
            .where(File.created_at > thirty_days_ago)
        )
        
        avg_storage_days = result.scalar() or 0
        
        # Calculate costs
        storage_cost = cls.calculate_storage_cost(total_size, avg_storage_days)
        
        # Estimate operations (upload + downloads + some overhead)
        operations = file_count * 2 + total_downloads
        operation_cost = cls.calculate_operation_cost(operations)
        
        total_cost = storage_cost + operation_cost
        
        # Get user's plan price
        plan_prices = {
            UserTier.FREE: 0,
            UserTier.PRO: 6.99,
            UserTier.MAX: 21.99
        }
        
        revenue = plan_prices[user.tier]
        profit = revenue - total_cost
        margin = (profit / revenue * 100) if revenue > 0 else 0
        
        return {
            "storage_cost": round(storage_cost, 2),
            "operation_cost": round(operation_cost, 2),
            "total_cost": round(total_cost, 2),
            "revenue": revenue,
            "profit": round(profit, 2),
            "margin_percent": round(margin, 1),
            "avg_storage_days": round(avg_storage_days, 1),
            "total_gb": round(total_size / (1024 * 1024 * 1024), 2),
            "total_downloads": total_downloads,
            "file_count": file_count
        }