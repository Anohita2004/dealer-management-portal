# Deploying Backend to Railway

This guide will help you deploy the Dealer Management Portal backend to [Railway](https://railway.app/).

## Prerequisites

1.  A [Railway](https://railway.app/) account.
2.  Your code pushed to a GitHub repository.

## Project Setup

We have already updated your `package.json` to include:
-   `sequelize-cli`: For running database migrations.
-   `migrate` script: To execute the migrations easily.

## Deployment Steps

### 1. Create Project on Railway
1.  Log in to Railway.
2.  Click **"New Project"**.
3.  Select **"Deploy from GitHub repo"** and choose your repository.
4.  Select the `backend` folder as the root directory if your repo has both frontend and backend. (If this is a monorepo, you might need to configure the "Root Directory" in Railway settings later).

### 2. Add Database
1.  In your Railway project view, right-click (or click "New") to add a service.
2.  Select **Database** -> **PostgreSQL**.
3.  This will create a Postgres instance.

### 3. Configure Environment Variables
1.  Click on your **Backend Service** card in Railway.
2.  Go to the **"Variables"** tab.
3.  Add the variables from your `.env` file.
    *   **Configuration Tips:**
        *   `PORT`: *Do not set this manually*. Railway sets `PORT` automatically.
        *   **Database Credentials**: Railway provides these Variables automatically if you link the database, or you can find them in the Postgres service "Connect" tab.
            *   `DB_HOST`: Use `${POSTGRES_HOST}`
            *   `DB_PORT`: Use `${POSTGRES_PORT}`
            *   `DB_NAME`: Use `${POSTGRES_DB}`
            *   `DB_USER`: Use `${POSTGRES_USER}`
            *   `DB_PASSWORD`: Use `${POSTGRES_PASSWORD}`
        *   **Other Secrets**:
            *   `JWT_SECRET`: Generate a strong random string.
            *   `RAZORPAY_*`: Use your Live keys for production.
            *   `CORS_ORIGIN`: Set this to your **Frontend URL** once deployed (e.g., `https://your-frontend.vercel.app`).

### 4. Configure Start Command
1.  Go to the **"Settings"** tab of your Backend Service.
2.  Locate the **"Deploy"** section.
3.  **Build Command**: Leave as default (`npm install` is handled automatically).
4.  **Start Command**: Change this to run migrations before starting the server:
    ```bash
    npm run migrate && npm start
    ```
    *This ensures your database tables are always up to date with your code.*

### 5. Deploy
1.  Railway usually deploys automatically on push.
2.  Check the **"Deployments"** tab to see the logs.
3.  If "Build" succeeds but "Deploy" fails, check the logs. It's often due to missing environment variables.

## Troubleshooting

-   **Database Connection Error**: Double-check your `DB_*` variables. Ensure they match the Railway Postgres credentials.
-   **"sequelize-cli not found"**: We added it to `dependencies`, so it should represent. If not, try `npx sequelize-cli db:migrate` in the Start Command.
-   **Build Failures**: Check the build logs. Ensure all dependencies install correctly.

## Verification
Once deployed, you can visit the provided Railway URL (e.g., `https://backend-production.up.railway.app/health`) to check if the server is running.
