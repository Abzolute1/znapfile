from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth, upload, download, files, account,
    batch_upload, sharing, preview, search, folders, collections, plans, payments,
    multipart_upload, share, simple_preview, secure_download, captcha, admin, security, pow,
    notifications, stats
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(upload.router, prefix="/upload", tags=["upload"])
api_router.include_router(download.router, prefix="/download", tags=["download"])
api_router.include_router(files.router, prefix="/files", tags=["files"])
api_router.include_router(account.router, prefix="/account", tags=["account"])
api_router.include_router(batch_upload.router, prefix="/batch", tags=["batch"])
api_router.include_router(sharing.router, prefix="/sharing", tags=["sharing"])
api_router.include_router(preview.router, prefix="/preview", tags=["preview"])
api_router.include_router(search.router, prefix="/search", tags=["search"])
api_router.include_router(folders.router, prefix="/folders", tags=["folders"])
api_router.include_router(collections.router, prefix="/collections", tags=["collections"])
api_router.include_router(plans.router, prefix="/plans", tags=["plans"])
api_router.include_router(payments.router, prefix="/payments", tags=["payments"])
api_router.include_router(multipart_upload.router, prefix="/multipart", tags=["multipart"])
api_router.include_router(share.router, prefix="/share", tags=["share"])
api_router.include_router(simple_preview.router, prefix="/simple", tags=["simple-preview"])
api_router.include_router(secure_download.router, prefix="/secure-download", tags=["secure-download"])
api_router.include_router(captcha.router, prefix="/captcha", tags=["captcha"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(security.router, prefix="/security", tags=["security"])
api_router.include_router(pow.router, prefix="/pow", tags=["pow"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(stats.router, prefix="/stats", tags=["stats"])