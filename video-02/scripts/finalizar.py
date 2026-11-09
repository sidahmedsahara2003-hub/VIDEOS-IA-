"""Deja el audio de un vídeo a -14 LUFS (dos pasadas de loudnorm) sin tocar la imagen.
Uso: python3 scripts/finalizar.py entrada.mp4 salida.mp4"""
import json, re, subprocess, sys
src, dst = sys.argv[1], sys.argv[2]
r = subprocess.run(["ffmpeg", "-hide_banner", "-i", src, "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-vn", "-f", "null", "-"],
                   capture_output=True, text=True)
m = json.loads(re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", r.stderr).group(0))
af = (f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:"
      f"measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", src, "-c:v", "copy", "-af", af, "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
                "-movflags", "+faststart", dst], check=True)
print("OK", dst)
