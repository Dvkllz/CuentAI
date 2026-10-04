from pathlib import Path
from PIL import Image, ImageDraw
root = Path(__file__).resolve().parents[1]
im = Image.new('RGBA', (1024, 1024), '#3465ee')
d = ImageDraw.Draw(im)
d.arc((185, 200, 710, 825), 42, 318, fill='white', width=65)
d.line([(616, 485), (704, 575), (850, 392)], fill='white', width=62, joint='curve')
for x,y in [(616,485),(704,575),(850,392)]: d.ellipse((x-31,y-31,x+31,y+31),fill='white')
for size in (192,512): im.resize((size,size), Image.Resampling.LANCZOS).save(root/'public'/f'icon-{size}.png')
for name,size in [('mdpi',48),('hdpi',72),('xhdpi',96),('xxhdpi',144),('xxxhdpi',192)]:
    dest=root/'android/app/src/main/res'/f'mipmap-{name}'
    if dest.exists():
        for f in ('ic_launcher.png','ic_launcher_round.png'): im.resize((size,size), Image.Resampling.LANCZOS).save(dest/f)
        foreground = Image.new('RGBA', (1024,1024), (0,0,0,0))
        foreground.paste(im.resize((640,640),Image.Resampling.LANCZOS),(192,192))
        foreground.resize((int(size*2.25),int(size*2.25)),Image.Resampling.LANCZOS).save(dest/'ic_launcher_foreground.png')
print('Iconos de CuentAI generados.')
