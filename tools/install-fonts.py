"""Bundle the three official OFL fonts before static deployment."""
from hashlib import sha256
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
SOURCE = "https://raw.githubusercontent.com/google/fonts/main/ofl/"
FAMILIES = {
    "fredoka": ("Fredoka", "Fredoka[wdth,wght].ttf"),
    "notosans": ("Noto Sans", "NotoSans[wdth,wght].ttf"),
    "robotomono": ("Roboto Mono", "RobotoMono[wght].ttf"),
}

def fetch(directory, filename):
    request = Request(SOURCE + directory + "/" + quote(filename),
                      headers={"User-Agent": "Ryu Study-font-setup/1"})
    with urlopen(request, timeout=30) as response:
        return response.read(4 * 1024 * 1024 + 1)

def main():
    files = {}
    rules = []
    paths = []
    for key, (family, filename) in FAMILIES.items():
        font = fetch(key, filename)
        license_text = fetch(key, "OFL.txt")
        if len(font) > 4 * 1024 * 1024 or font[:4] not in (b"\x00\x01\x00\x00", b"OTTO"):
            raise ValueError(f"Unexpected font data for {family}")
        if b"SIL OPEN FONT LICENSE" not in license_text:
            raise ValueError(f"Unexpected license for {family}")
        path = f"assets/fonts/{key}.ttf"
        files[path] = font
        files[f"assets/fonts/{key}-OFL.txt"] = license_text
        paths.append(path)
        rules.append(f'@font-face {{font-family:"{family}";src:url("./{path}") format("truetype");font-weight:400 700;font-display:swap}}')
    version = sha256(b"".join(files.values())).hexdigest()[:12]
    for name, data in files.items():
        target = ROOT / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
    (ROOT / "fonts.css").write_text("\n".join(rules) + "\n", encoding="utf-8")
    (ROOT / "font-assets.js").write_text(
        "const FONT_VERSION = " + repr(version) + ";\n"
        "const FONT_ASSETS = [" + ",".join(repr("./" + path) for path in paths) + "];\n",
        encoding="utf-8",
    )
    print("Three fonts and their OFL licenses are ready for offline use.")

if __name__ == "__main__":
    main()
