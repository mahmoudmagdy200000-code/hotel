[System.Net.ServicePointManager]::ServerCertificateValidationCallback = {$true}
$url = "https://localhost:5001/api/Users/login"
$body = '{"email":"administrator@localhost","password":"Administrator1!"}'
$bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
$request = [System.Net.HttpWebRequest]::Create($url)
$request.Method = "POST"
$request.ContentType = "application/json"
$request.ContentLength = $bytes.Length
$requestStream = $request.GetRequestStream()
$requestStream.Write($bytes, 0, $bytes.Length)
$requestStream.Close()
$response = $request.GetResponse()
$reader = New-Object System.IO.StreamReader($response.GetResponseStream())
$responseText = $reader.ReadToEnd()
Write-Output $responseText
