-- Add abuse prevention fields to files table

-- Add bandwidth tracking fields
ALTER TABLE files ADD COLUMN last_download_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE files ADD COLUMN unique_downloaders INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE files ADD COLUMN bandwidth_used BIGINT DEFAULT 0 NOT NULL;

-- Create indexes for abuse detection queries
CREATE INDEX IF NOT EXISTS idx_files_bandwidth_used ON files(bandwidth_used);
CREATE INDEX IF NOT EXISTS idx_files_last_download_at ON files(last_download_at);
CREATE INDEX IF NOT EXISTS idx_files_user_created ON files(user_id, created_at);

-- Add comment explaining fields
COMMENT ON COLUMN files.bandwidth_used IS 'Total bandwidth consumed by downloads (file_size * download_count)';
COMMENT ON COLUMN files.unique_downloaders IS 'Approximate count of unique IP addresses that downloaded this file';
COMMENT ON COLUMN files.last_download_at IS 'Timestamp of the most recent download';