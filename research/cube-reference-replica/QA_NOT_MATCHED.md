# Not approved: exact GIF reconstruction requirement

User requested a pure reconstruction of the reference GIF that completely overlaps it. This attempt does NOT meet that requirement and must not be described as a completed exact replica.

Independent 4D geometry (16 vertices / 32 cylindrical edges / 24 translucent squares), original forward rotation, no characters, fixed estimated camera. Blender CPU Cycles render. 48 frames, 256×256, original70ms duration per frame,3.36s cycle.

Compared all48frames against authoritative original https://commons.wikimedia.org/wiki/File:8-cell-simple.gif (JasonHise public domain). Mean fullRGB RMSE39.287/255; worst45.465/255;65.80% pixels differ. Original Cycles/Maya material, lighting, camera and GIF quantization are not recovered. A separate projective edge fit achieved a mean5.237px² custom thresholded line metric; this is NOT a pixel identity result and not all fitted general projection parameters were physically integrated into the Blender camera.

No original Maya scene/code found. Author's later general workflow is at https://commons.wikimedia.org/wiki/User_talk:JasonHise#Software and https://diff.wikimedia.org/2016/09/22/math-gifs/ ; these do not provide the2007 parameters.

Generated local files: reference-reconstruction.gif / .mp4, comparison.jpg, pixel-error.json, fit-report.json, geometry-overlay.jpg, rebuild.blend, blender_rebuild.py. Not uploaded; no game modification.

Exact visual playback can use the verified originalGIF directly, explicitly labeled original rather than reconstructed. True modifiable3D fidelity can be improved further, but exactpixelidentity cannot currently be established from recoveredsource.
