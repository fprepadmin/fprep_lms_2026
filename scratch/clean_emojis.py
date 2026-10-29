import os
import re
import unicodedata

src_dir = r"d:\FPREP\src"
extensions = (".ts", ".tsx", ".js")

# Những ký tự So đặc biệt cần giữ lại (nếu có, nhưng thường không có ký tự Việt nào thuộc So)
# Các ký tự như ✔, ✓ có thể là So. Người dùng yêu cầu "KHÔNG ĐƯỢC CÓ emoji" nên ta có thể loại bỏ cả các tick check dạng symbol hoặc thay bằng chữ.
keep_chars = set()

def clean_file(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    new_content = []
    modified = False
    for char in content:
        cat = unicodedata.category(char)
        # Loại bỏ các ký tự thuộc nhóm 'So' (Symbol, other - chứa hầu hết emoji) 
        # và các ký tự surrogate/emojis nằm ngoài Plane 0 (Mã > 0xFFFF)
        if (cat == 'So' or ord(char) > 0xFFFF) and char not in keep_chars:
            print(f"Removing emoji/symbol '{char}' (U+{ord(char):04X}, category={cat}) from {os.path.basename(filepath)}")
            modified = True
            continue
        new_content.append(char)
        
    if modified:
        with open(filepath, "w", encoding="utf-8") as f:
            f.write("".join(new_content))

for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith(extensions):
            clean_file(os.path.join(root, file))

# Dọn dẹp cả tệp tin gas_email_sender.js ở thư mục gốc
gas_file = r"d:\FPREP\gas_email_sender.js"
if os.path.exists(gas_file):
    clean_file(gas_file)
