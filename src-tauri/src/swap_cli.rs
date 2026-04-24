//! Fallback wrapper around the `cswap` CLI.
//!
//! After v0.2 the GUI performs switch/add/remove natively in Rust, so this
//! module is reserved for best-effort detection and emergency fallbacks.
//! Two hard rules on Windows:
//!   * never spawn `cswap` just to check for existence — use `which`
//!   * every real spawn must set `CREATE_NO_WINDOW`, otherwise Windows flashes
//!     a cmd window every time (that is exactly what the user saw every 30s)

use once_cell::sync::OnceCell;
use std::process::Stdio;
use tokio::io::AsyncWriteExt;
use tokio::process::Command;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

#[derive(Debug, thiserror::Error)]
pub enum CliError {
    #[error("cswap CLI not found on PATH")]
    NotInstalled,
    #[error("cswap exited with status {status}: {stderr}")]
    NonZero { status: i32, stderr: String },
    #[error("io: {0}")]
    Io(#[from] std::io::Error),
}

static CSWAP_AVAILABLE: OnceCell<bool> = OnceCell::new();

/// Return true when `cswap` is reachable on PATH. Result is cached for the
/// lifetime of the process — we never spawn a subprocess just for probing.
pub fn probe() -> bool {
    *CSWAP_AVAILABLE.get_or_init(|| which::which("cswap").is_ok())
}

fn configure(cmd: &mut Command) {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    let _ = cmd;
}

#[allow(dead_code)]
async fn run(args: &[&str], stdin_input: Option<&str>) -> Result<String, CliError> {
    let mut cmd = Command::new("cswap");
    cmd.args(args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .stdin(if stdin_input.is_some() {
            Stdio::piped()
        } else {
            Stdio::null()
        });
    configure(&mut cmd);

    let mut child = match cmd.spawn() {
        Ok(c) => c,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Err(CliError::NotInstalled),
        Err(e) => return Err(CliError::Io(e)),
    };

    if let (Some(input), Some(mut stdin)) = (stdin_input, child.stdin.take()) {
        stdin.write_all(input.as_bytes()).await?;
        drop(stdin);
    }

    let output = child.wait_with_output().await?;
    if !output.status.success() {
        return Err(CliError::NonZero {
            status: output.status.code().unwrap_or(-1),
            stderr: String::from_utf8_lossy(&output.stderr).into_owned(),
        });
    }
    Ok(String::from_utf8_lossy(&output.stdout).into_owned())
}
