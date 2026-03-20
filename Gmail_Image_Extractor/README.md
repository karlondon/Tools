# Gmail Image Extractor v1.0

A standalone Windows tool that scans your Gmail emails, extracts image attachments, and organizes them into folders by **Month-Year**.

## Features

- **Gmail IMAP connection** - Connects securely via SSL to Gmail
- **Image detection** - Finds all image attachments (JPG, PNG, GIF, BMP, TIFF, WebP, HEIC)
- **Smart folder organization** - Saves images into `<Month>-<Year>` folders (e.g., `March-2025`)
- **Intelligent file naming**:
  - Images with a date/time stamp in the filename (e.g., `IMG_20231015_143022.jpg`) → **kept as-is**
  - Images with only a number (e.g., `IMG_0001.jpg`, `DSC0042.jpg`) → **renamed to `<EmailSubject>-01.jpg`** with sequential numbering
  - Other filenames → kept as-is (sanitized for Windows)
- **No credentials stored** - Username and password are prompted at runtime only
- **Duplicate handling** - Appends `_1`, `_2` etc. if a file already exists
- **Compiles to standalone .exe** - No Python needed on the target machine

## Prerequisites (for building)

- **Python 3.8+** installed on Windows
- **pip** (comes with Python)

## Quick Start - Build the .exe

1. Copy the `Gmail_Image_Extractor` folder to your **Windows laptop**
2. Open a Command Prompt in the folder
3. Run the build script:

```batch
build.bat
```

4. The executable will be created at `dist\GmailImageExtractor.exe`
5. Copy `GmailImageExtractor.exe` anywhere you like and double-click to run

### Manual Build (alternative)

```batch
pip install pyinstaller
pyinstaller --onefile --name GmailImageExtractor --console gmail_image_extractor.py
```

## Usage

1. **Double-click** `GmailImageExtractor.exe` (or run from command line)
2. Enter your **Gmail address** when prompted
3. Enter your **Gmail App Password** when prompted (input is hidden)
4. Optionally specify an output folder (defaults to `Desktop\Gmail_Images`)
5. The tool scans your emails and extracts images

### Example Output Structure

```
Gmail_Images/
├── January-2024/
│   ├── IMG_20240115_093045.jpg      (kept original - has date stamp)
│   ├── Holiday_Photos-01.jpg        (was IMG_0001.jpg, renamed with subject)
│   └── Holiday_Photos-02.jpg        (was IMG_0002.jpg, renamed with subject)
├── March-2025/
│   ├── IMG_20250301_142233.png      (kept original - has date stamp)
│   └── sunset_beach.jpg             (kept original - descriptive name)
└── October-2025/
    └── Work_Meeting_Notes-01.png    (was DSC0001.png, renamed with subject)
```

## Gmail App Password Setup

Gmail requires an **App Password** instead of your regular password:

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable **2-Step Verification** (if not already enabled)
3. Go to [App Passwords](https://myaccount.google.com/apppasswords)
4. Select **Mail** and **Windows Computer**
5. Click **Generate** - copy the 16-character password
6. Use this password when the tool prompts you

> **Security Note**: The tool never stores your credentials. They exist only in memory during execution.

## File Naming Rules

| Original Filename | Has Date Stamp? | Action | Result |
|---|---|---|---|
| `IMG_20231015_143022.jpg` | Yes | Keep original | `IMG_20231015_143022.jpg` |
| `DSC_20240301_092100.png` | Yes | Keep original | `DSC_20240301_092100.png` |
| `IMG_0001.jpg` | No (number only) | Rename with subject | `Holiday_Photos-01.jpg` |
| `DSC0042.png` | No (number only) | Rename with subject | `Team_Dinner-01.png` |
| `sunset_beach.jpg` | No | Keep original | `sunset_beach.jpg` |
| `photo from trip.jpg` | No | Sanitize | `photo_from_trip.jpg` |

## Troubleshooting

| Issue | Solution |
|---|---|
| Login failed | Ensure you're using an App Password, not your regular password |
| IMAP not enabled | Go to Gmail Settings > Forwarding and POP/IMAP > Enable IMAP |
| No images found | Check that emails actually have image attachments (not inline) |
| Antivirus blocks .exe | Add an exception for `GmailImageExtractor.exe` |
| Times out on large mailboxes | The tool processes all emails; large mailboxes take time |

## Technical Details

- Uses Python's built-in `imaplib` and `email` libraries (no external dependencies at runtime)
- Connects via IMAP4 SSL on port 993
- Scans both INBOX and [Gmail]/All Mail
- Only PyInstaller is needed as a build dependency
- The compiled .exe is fully standalone (no Python required to run)