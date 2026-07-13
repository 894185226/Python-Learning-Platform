$filePath = "c:\Users\89418\Desktop\PythonVariableLesson\lib\monokai.min.css"
$content = Get-Content -Path $filePath -Raw
$content | Out-File -FilePath "c:\Users\89418\Desktop\PythonVariableLesson\_content_monokai.txt" -Encoding UTF8 -NoNewline
Write-Output "Done: $($content.Length) chars"