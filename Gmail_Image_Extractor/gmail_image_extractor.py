#!/usr/bin/env python3
"""Gmail Image Extractor v1.0 - Extract image attachments from Gmail emails.
Organizes images into Month-Year folders. Credentials prompted at runtime."""

import imaplib, email, os, re, sys, getpass
from email.header import decode_header
from email.utils import parsedate_to_datetime
from datetime import datetime
from collections import defaultdict

IMAP_SERVER = "imap.gmail.com"
IMAP_PORT = 993
IMAGE_EXTS = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.tif', '.webp', '.heic', '.heif'}
MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December']

DATE_STAMP_RE = re.compile(r'(\d{4})[-_]?(\d{2})[-_]?(\d{2})[-_T]?(\d{2}[-_]?\d{2}[-_]?\d{2})?')
NUM_ONLY_RE = re.compile(
    r'^(?:IMG|DSC|PHOTO|PIC|IMAGE|DCIM|DJI|GOPR|GP|PANO|VID|P|MVI)?[-_ ]?(\d{1,6})(?:\s*\(\d+\))?$',
    re.IGNORECASE)


def sanitize(name, maxlen=100):
    name = re.sub(r'[<>:"/\\|?*]', '_', name)
    name = re.sub(r'[\s_]+', '_', name).strip('. ')
    return name[:maxlen] if len(name) > maxlen else name


def decode_hdr(val):
    if not val:
        return "No_Subject"
    parts = decode_header(val)
    result = []
    for p, cs in parts:
        if isinstance(p, bytes):
            try:
                result.append(p.decode(cs or 'utf-8', errors='replace'))
            except (LookupError, UnicodeDecodeError):
                result.append(p.decode('utf-8', errors='replace'))
        else:
            result.append(p)
    return ''.join(result).strip()


def get_date(msg):
    try:
        return parsedate_to_datetime(msg.get('Date', ''))
    except Exception:
        return datetime.now()


def has_date_stamp(stem):
    m = DATE_STAMP_RE.search(stem)
    if not m:
        return False
    y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
    return 1900 <= y <= 2099 and 1 <= mo <= 12 and 1 <= d <= 31


def is_number_only(stem):
    return bool(NUM_ONLY_RE.match(stem))


def month_year_folder(dt):
    return f"{MONTHS[dt.month]}-{dt.year}"


def connect_gmail(username, password):
    print(f"\n  Connecting to {IMAP_SERVER}...")
    mail = imaplib.IMAP4_SSL(IMAP_SERVER, IMAP_PORT)
    mail.login(username, password)
    print("  Login successful!")
    return mail


def process_emails(mail, output_base):
    folders_to_scan = ['INBOX', '"[Gmail]/All Mail"']
    total_images = 0
    subject_counters = defaultdict(int)

    for folder in folders_to_scan:
        print(f"\n  Scanning folder: {folder}")
        try:
            status, data = mail.select(folder, readonly=True)
            if status != 'OK':
                print(f"    Could not open {folder}, skipping.")
                continue
        except Exception as e:
            print(f"    Error opening {folder}: {e}")
            continue

        msg_count = int(data[0])
        print(f"    Found {msg_count} messages. Scanning for images...")

        status, msg_ids = mail.search(None, 'ALL')
        if status != 'OK':
            continue

        ids = msg_ids[0].split()
        for i, num in enumerate(ids, 1):
            if i % 100 == 0:
                print(f"    Processed {i}/{len(ids)} emails...")
            try:
                status, msg_data = mail.fetch(num, '(RFC822)')
                if status != 'OK':
                    continue
            except Exception:
                continue

            raw = msg_data[0][1]
            msg = email.message_from_bytes(raw)
            subject = sanitize(decode_hdr(msg.get('Subject')))
            email_date = get_date(msg)
            folder_name = month_year_folder(email_date)
            folder_path = os.path.join(output_base, folder_name)
            subj_key = f"{folder_name}/{subject}"

            for part in msg.walk():
                ctype = part.get_content_type()
                cdisp = str(part.get('Content-Disposition', ''))

                if 'attachment' not in cdisp and not ctype.startswith('image/'):
                    continue

                filename = part.get_filename()
                if not filename:
                    ext = ctype.split('/')[-1]
                    if ext == 'jpeg':
                        ext = 'jpg'
                    filename = f"image.{ext}"

                filename = decode_hdr(filename) if filename else "image.jpg"
                _, ext = os.path.splitext(filename)
                if ext.lower() not in IMAGE_EXTS:
                    continue

                img_data = part.get_payload(decode=True)
                if not img_data:
                    continue

                stem = os.path.splitext(filename)[0]

                if has_date_stamp(stem):
                    final_name = sanitize(stem) + ext.lower()
                elif is_number_only(stem):
                    subject_counters[subj_key] += 1
                    seq = subject_counters[subj_key]
                    final_name = f"{subject}-{seq:02d}{ext.lower()}"
                else:
                    final_name = sanitize(stem) + ext.lower()

                os.makedirs(folder_path, exist_ok=True)
                save_path = os.path.join(folder_path, final_name)
                if os.path.exists(save_path):
                    base, fext = os.path.splitext(final_name)
                    c = 1
                    while os.path.exists(save_path):
                        save_path = os.path.join(folder_path, f"{base}_{c}{fext}")
                        c += 1

                with open(save_path, 'wb') as f:
                    f.write(img_data)
                total_images += 1
                print(f"    Saved: {folder_name}/{os.path.basename(save_path)}")

        print(f"    Finished {folder}. Scanned {len(ids)} emails.")
    return total_images


def main():
    print("\n" + "=" * 56)
    print("       Gmail Image Extractor v1.0")
    print("  Extract & organize email image attachments")
    print("=" * 56)
    print("\n  NOTE: Use a Gmail App Password, not your regular password.")
    print("  Generate one at: https://myaccount.google.com/apppasswords")
    print("  (Requires 2-Step Verification to be enabled)\n")

    username = input("  Gmail address: ").strip()
    if not username:
        print("  Error: Email address required.")
        sys.exit(1)

    password = getpass.getpass("  App Password: ")
    if not password:
        print("  Error: Password required.")
        sys.exit(1)

    default_out = os.path.join(os.path.expanduser("~"), "Desktop", "Gmail_Images")
    out_input = input(f"\n  Output folder [{default_out}]: ").strip()
    output_dir = out_input if out_input else default_out
    print(f"\n  Images will be saved to: {output_dir}")

    try:
        mail = connect_gmail(username, password)
    except imaplib.IMAP4.error as e:
        print(f"\n  Login FAILED: {e}")
        print("  Check your email and App Password are correct.")
        input("\n  Press Enter to exit...")
        sys.exit(1)
    except Exception as e:
        print(f"\n  Connection error: {e}")
        input("\n  Press Enter to exit...")
        sys.exit(1)

    try:
        total = process_emails(mail, output_dir)
    except KeyboardInterrupt:
        print("\n\n  Interrupted by user.")
        total = 0
    except Exception as e:
        print(f"\n  Error during processing: {e}")
        total = 0
    finally:
        try:
            mail.close()
            mail.logout()
        except Exception:
            pass

    print(f"\n  {'=' * 40}")
    print(f"  Done! Extracted {total} images.")
    print(f"  Saved to: {output_dir}")
    print(f"  {'=' * 40}")
    input("\n  Press Enter to exit...")


if __name__ == '__main__':
    main()