$vars = @(
    @("FRONTEND_URL", "https://kodo-app-ten.vercel.app"),
    @("BACKEND_URL", "https://kodo-app-ten.vercel.app"),
    @("LOG_LEVEL", "info"),
    @("SMTP_HOST", "smtp.gmail.com"),
    @("SMTP_PORT", "587"),
    @("SMTP_FROM", "noreply@kodo.com"),
    @("TERMII_SENDER_ID", "KODO"),
    @("BULKSMS_SENDER_ID", "KODO"),
    @("NOTIFICATION_EMAIL", "noreply@kodo.com"),
    @("STRIPE_SECRET_KEY", "sk_test_placeholder_replace_with_real"),
    @("STRIPE_WEBHOOK_SECRET", "whsec_placeholder_replace_with_real"),
    @("STRIPE_PUBLISHABLE_KEY", "pk_test_placeholder_replace_with_real"),
    @("CLOUDINARY_CLOUD_NAME", "placeholder_replace_with_real"),
    @("CLOUDINARY_API_KEY", "placeholder_replace_with_real"),
    @("CLOUDINARY_API_SECRET", "placeholder_replace_with_real"),
    @("VITE_API_URL", "https://kodo-app-ten.vercel.app/api"),
    @("VITE_APP_URL", "https://kodo-app-ten.vercel.app"),
    @("VITE_MAPBOX_TOKEN", "placeholder_rotate_your_mapbox_token")
)

foreach ($pair in $vars) {
    $key = $pair[0]
    $val = $pair[1]
    Write-Host "Setting $key ..."
    $val | vercel env add $key production --scope codez-mania-team --force 2>&1 | Out-Null
    Write-Host "  done: $key"
}

Write-Host "All environment variables set."
