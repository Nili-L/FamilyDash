# Deployment Guide for Family Dashboard

This guide provides detailed instructions for deploying the Family Dashboard application to various platforms.

## Prerequisites

Before deploying, ensure you have:
- Built the application successfully with `npm run build`
- Tested the production build locally with `npm run preview`
- All environment variables configured (if any)

## Platform-Specific Deployment

### Vercel (Recommended)

Vercel offers the easiest deployment with automatic HTTPS and global CDN.

#### Method 1: Vercel CLI
```bash
# Install Vercel CLI globally
npm i -g vercel

# Deploy
vercel

# Follow the prompts:
# - Link to existing project or create new
# - Select the `dist` directory
# - Deploy to production
```

#### Method 2: Git Integration
1. Push your code to GitHub/GitLab/Bitbucket
2. Visit [vercel.com](https://vercel.com)
3. Import your repository
4. Configure build settings:
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Deploy

### Netlify

#### Method 1: Drag and Drop
1. Run `npm run build`
2. Visit [app.netlify.com](https://app.netlify.com)
3. Drag the `dist` folder to the deployment area

#### Method 2: Netlify CLI
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Login to Netlify
netlify login

# Deploy
netlify deploy --prod --dir=dist
```

#### Method 3: Git Integration
1. Connect your Git repository to Netlify
2. Configure build settings:
   - Build Command: `npm run build`
   - Publish Directory: `dist`

### GitHub Pages

1. Install gh-pages package:
```bash
npm install --save-dev gh-pages
```

2. Add to `vite.config.js`:
```javascript
export default defineConfig({
  base: '/family-dashboard/',
  // ... rest of config
})
```

3. Add to `package.json`:
```json
{
  "scripts": {
    "predeploy": "npm run build",
    "deploy": "gh-pages -d dist"
  }
}
```

4. Deploy:
```bash
npm run deploy
```

5. Enable GitHub Pages in repository settings

### AWS S3 + CloudFront

1. Build the project:
```bash
npm run build
```

2. Create S3 bucket:
```bash
aws s3 mb s3://family-dashboard-bucket
```

3. Configure bucket for static hosting:
```bash
aws s3 website s3://family-dashboard-bucket \
  --index-document index.html \
  --error-document index.html
```

4. Upload files:
```bash
aws s3 sync dist/ s3://family-dashboard-bucket --acl public-read
```

5. Create CloudFront distribution for HTTPS and CDN

### Docker Deployment

1. Create `Dockerfile`:
```dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

2. Create `nginx.conf`:
```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

3. Build and run:
```bash
docker build -t family-dashboard .
docker run -p 80:80 family-dashboard
```

## Environment Configuration

### Base URL Configuration

If deploying to a subdirectory, update `vite.config.js`:
```javascript
export default defineConfig({
  base: '/your-subdirectory/',
  // ... rest of config
})
```

### Custom Domain Setup

#### Vercel
1. Go to project settings
2. Add custom domain
3. Follow DNS configuration instructions

#### Netlify
1. Go to domain settings
2. Add custom domain
3. Configure DNS

## Post-Deployment Checklist

- [ ] Verify all pages load correctly
- [ ] Test data persistence (localStorage)
- [ ] Check responsive design on mobile
- [ ] Verify all features work as expected
- [ ] Test data export/import functionality
- [ ] Check browser console for errors
- [ ] Verify HTTPS is enabled
- [ ] Test performance with Lighthouse

## Continuous Deployment

### GitHub Actions

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Build
      run: npm run build
      
    - name: Deploy to Vercel
      uses: amondnet/vercel-action@v20
      with:
        vercel-token: ${{ secrets.VERCEL_TOKEN }}
        vercel-org-id: ${{ secrets.ORG_ID}}
        vercel-project-id: ${{ secrets.PROJECT_ID}}
```

## Monitoring

### Analytics (Optional)

To add analytics, consider privacy-focused options:
- Plausible
- Fathom
- Self-hosted Matomo

### Error Tracking (Optional)

For production error tracking:
- Sentry
- Rollbar
- LogRocket

## Troubleshooting

### Build Fails
- Check Node.js version (requires 16+)
- Clear node_modules and reinstall
- Check for TypeScript errors

### 404 Errors on Routes
- Ensure SPA routing is configured
- Check base URL configuration

### localStorage Not Working
- Check browser security settings
- Ensure HTTPS is enabled
- Test in incognito mode

### Performance Issues
- Enable gzip compression
- Configure proper caching headers
- Use CDN for static assets
- Optimize images

## Security Considerations

1. Always use HTTPS in production
2. Configure Content Security Policy headers
3. Keep dependencies updated
4. Use environment variables for sensitive data
5. Configure CORS properly if using APIs

## Backup Recommendations

Since data is stored in localStorage:
1. Remind users to export data regularly
2. Consider implementing auto-backup reminders
3. Test data import/export thoroughly

---

For deployment support, please check the [Issues](https://github.com/yourusername/family-dashboard/issues) page or create a new issue with the deployment platform you're using.