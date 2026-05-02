import re
from htmldocx import HtmlToDocx

with open('CMS_Cloud_Hosting_New_Account_Provisioning_SOP.html', 'r') as f:
    html = f.read()

# Remove img tags to avoid base64 filename issues
html = re.sub(r'<img[^>]*>', '', html)

parser = HtmlToDocx()
parser.parse_html_string(html)
parser.doc.save('CMS_Cloud_Hosting_New_Account_Provisioning_SOP.docx')

import os
print('Done:', os.path.getsize('CMS_Cloud_Hosting_New_Account_Provisioning_SOP.docx'), 'bytes')