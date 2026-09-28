$src = "C:\Users\89418\AppData\Local\Temp\trae\screenshots"
$dest = "c:\Users\89418\Desktop\PythonVariableLesson\images\manual"
$files = Get-ChildItem -Path "$src\*.png" | Sort-Object LastWriteTime -Descending | Select-Object -First 6
$names = @("01-homepage.png", "02-chapter-view.png", "03-admin-login.png", "05-achievement-wall.png", "07-search.png", "08-chapter2-variable.png")
for ($i = 0; $i -lt [Math]::Min($files.Count, $names.Count); $i++) {
    $target = Join-Path $dest $names[$i]
    Copy-Item -Path $files[$i].FullName -Destination $target -Force
    Write-Host "Copied: $($files[$i].Name) -> $target"
}
Write-Host "Done. $($files.Count) files copied."