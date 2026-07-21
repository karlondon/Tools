#!/bin/bash
/Library/Frameworks/Python.framework/Versions/3.14/bin/python3.14 /Users/karthiksankaran/PS-Scripts/CV/generate_cv_docx.py
echo "Exit code: $?"
ls -lh /Users/karthiksankaran/PS-Scripts/CV/Karthik_Sankaran_CV_AD.docx 2>&1

echo ""
echo "--- Reading PPTX ---"
/Library/Frameworks/Python.framework/Versions/3.14/bin/python3.14 << 'PYEOF'
from pptx import Presentation
prs = Presentation("/Users/karthiksankaran/PS-Scripts/CV/Karthik Sankaran-one-Pager.pptx")
for i, slide in enumerate(prs.slides):
    print(f"--- Slide {i+1} ---")
    for shape in slide.shapes:
        if shape.has_text_frame:
            for para in shape.text_frame.paragraphs:
                t = para.text.strip()
                if t:
                    print(repr(t))
PYEOF