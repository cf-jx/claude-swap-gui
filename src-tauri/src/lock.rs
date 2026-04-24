//! Cross-process file lock — Rust port of `claude_swap.locking.FileLock`.
//!
//! Uses fs4's advisory file locks (WinAPI LockFile on Windows, flock on POSIX),
//! matching the behaviour of the Python CLI so the two implementations
//! coexist on the same `~/.claude-swap-backup/.lock` file.

use std::fs::{File, OpenOptions};
use std::path::Path;
use std::thread::sleep;
use std::time::{Duration, Instant};

use fs4::fs_std::FileExt;

pub struct FileLock {
    file: Option<File>,
}

#[derive(Debug, thiserror::Error)]
pub enum LockError {
    #[error("failed to acquire lock within {}s", .0)]
    Timeout(u64),
    #[error("io: {0}")]
    Io(#[from] std::io::Error),
}

impl FileLock {
    /// Acquire an exclusive lock on `lock_path`, polling until `timeout`.
    pub fn acquire(lock_path: &Path, timeout: Duration) -> Result<Self, LockError> {
        if let Some(parent) = lock_path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let file = OpenOptions::new()
            .create(true)
            .write(true)
            .truncate(false)
            .open(lock_path)?;

        let deadline = Instant::now() + timeout;
        loop {
            match file.try_lock_exclusive() {
                Ok(()) => {
                    return Ok(Self { file: Some(file) });
                }
                Err(_) => {
                    if Instant::now() >= deadline {
                        return Err(LockError::Timeout(timeout.as_secs()));
                    }
                    sleep(Duration::from_millis(100));
                }
            }
        }
    }
}

impl Drop for FileLock {
    fn drop(&mut self) {
        if let Some(file) = self.file.take() {
            let _ = FileExt::unlock(&file);
        }
    }
}
