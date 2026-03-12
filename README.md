# AI Chat App

This project is fully ready for deployment on Vercel's free tier. It includes a multi-user safe backend with a sequential free-tier API fallback chain (Gemini -> OpenAI -> Cohere -> OpenRouter -> Hugging Face).

## Vercel Deployment Instructions

1. **Push to GitHub**: Push this repository to your GitHub account.
2. **Import in Vercel**: Go to Vercel, click "Add New Project", and import your GitHub repository.
3. **Configure Project**:
   - **Framework Preset**: Vite (Vercel should auto-detect this)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
4. **Environment Variables**:
   In the Vercel dashboard, go to your project settings -> Environment Variables, and add the following keys (you only need to add the ones you want to use, but adding all ensures the fallback chain works perfectly):
   - `GEMINI_API_KEY`
   - `OPENAI_API_KEY`
   - `COHERE_API_KEY`
   - `OPENROUTER_API_KEY`
   - `HF_API_KEY`
   - `JWT_SECRET` (Set to a random string for secure authentication)
5. **Deploy**: Click Deploy!

## AdSense Verification & Google Recognition

After deploying to Vercel, you will get a URL (e.g., `your-app.vercel.app`). To get approved for Google AdSense:

1. **Custom Domain (Recommended)**: AdSense prefers custom domains (like `yourwebsite.com`) over `.vercel.app` subdomains. You can buy a domain and link it in Vercel Settings -> Domains.
2. **Add AdSense Code**:
   - Go to Google AdSense, add your site URL.
   - Google will give you a `<script>` tag.
   - Add this script tag inside the `<head>` section of your `index.html` file.
3. **Privacy Policy & Terms**: Ensure your website has a Privacy Policy, Terms of Service, and Contact Us page. AdSense requires these for approval.
4. **Content**: Ensure your app has enough text content/value to be approved.
5. **Submit for Review**: In the AdSense dashboard, click "Request Review". It usually takes a few days to a couple of weeks.

Once approved, you can create Ad Units in AdSense and place the ad code inside your React components where you want ads to appear.

---

**Important Note regarding Database on Vercel:**
Since Vercel uses Serverless Functions with a read-only filesystem, the SQLite database is stored in the temporary `/tmp` directory to prevent crashes. This means user accounts and chat history stored in the backend will be reset periodically when Vercel spins down the function. For a production app with persistent data, you should migrate the database connection in `backend/db.ts` to a cloud provider like **Vercel Postgres**, **Supabase**, or **MongoDB**.
