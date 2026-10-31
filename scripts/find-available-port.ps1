# ==============================================================================
# Helper Script: Find available TCP port
# ==============================================================================
param (
    [int]$StartPort = 4200
)

$port = $StartPort
while ($port -lt ($StartPort + 100)) {
    $listener = $null
    try {
        $ip = [System.Net.IPAddress]::Loopback
        $listener = [System.Net.Sockets.TcpListener]::new($ip, $port)
        $listener.Start()
        $listener.Stop()
        return $port
    } catch {
        $port++
    } finally {
        if ($listener -ne $null) {
            try { $listener.Stop() } catch { }
        }
    }
}

return $StartPort
