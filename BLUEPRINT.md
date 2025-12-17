# HealthGuardian - Project Blueprint

## 1. Project Structure

### Frontend (React/TypeScript)
*   **`index.tsx`**: The entry point that mounts the React app to the DOM.
*   **`App.tsx`**: Manages the main routing (`react-router-dom`) and Authentication state (`AuthContext`).
*   **`pages/`**: Contains the individual view logic.
    *   `Login/Signup`: Handles user entry.
    *   `Dashboard`: Central hub.
    *   `TreatmentPlan`: Core logic for inputting symptoms and viewing results.
    *   `Reminders`: A view that parses the saved plan to show AM/PM schedules.
    *   `Chatbot`: Integrates with `@google/genai` (Gemini) for AI assistance.
    *   `Locations`: Iframe stub for Google Maps integration.
*   **`components/`**: Reusable UI parts like the `Layout` (Sidebar).
*   **`types.ts`**: TypeScript interfaces to ensure data consistency.

### Backend (Python/Flask)
*   **`backend/app.py`**: The main server file.
    *   Initializes SQLite database.
    *   Provides API endpoints for Auth, Plan Saving, PDF Generation.
*   **`backend/database.db`**: The SQLite file (created automatically on run).

---

## 2. Database Schema (SQLite)

### Table: `users`
| Column | Type | Description |
|All|All|All|
| `id` | INTEGER PK | Unique ID |
| `username` | TEXT | Display name |
| `email` | TEXT | Unique login email |
| `password_hash` | TEXT | Hashed password |
| `created_at` | TIMESTAMP | Registration time |

### Table: `treatment_plans`
| Column | Type | Description |
|All|All|All|
| `id` | INTEGER PK | Plan ID |
| `user_id` | INTEGER FK | Links to `users` |
| `patient_name` | TEXT | Name of patient |
| `details` | TEXT | Raw JSON of inputs (history, symptoms) |
| `plan_json` | TEXT | The generated output (medicines, diet) |
| `created_at` | TIMESTAMP | Creation time |

---

## 3. How to Run

### Frontend (Development Mode)
Since this code is generated in a React environment, it runs automatically in the preview.

### Backend (Local Setup)
To run the full-stack features (PDF generation, Persistent DB) locally:

1.  **Install Python** (3.8+).
2.  Navigate to the backend folder:
    ```bash
    cd backend
    ```
3.  Install requirements:
    ```bash
    pip install -r requirements.txt
    ```
4.  Run the server:
    ```bash
    python app.py
    ```
5.  The server will start at `http://localhost:5000`.
6.  *Note:* You may need to update `App.tsx` or `api.ts` to point to this local URL instead of the browser-based simulation used for the demo.

---

## 4. API Integrations

### AI Chatbot (Gemini)
The app uses Google's `gemini-2.5-flash` model.
*   **Key Location:** `pages/Chatbot.tsx`
*   **Setup:** Ensure `process.env.API_KEY` is set in your environment variables.

### Google Maps
The app currently uses an Embed Iframe for demonstration.
*   To make it dynamic, replace the iframe in `pages/Locations.tsx` with the Google Maps JavaScript API and provide an API Key.

### WhatsApp
Located in `backend/app.py` (`/send-whatsapp`), currently a stub.
*   To enable, sign up for Twilio, get an SID/Token, and uncomment the `twilio` code in `app.py`.

---

## 5. Disclaimer
**This is a demonstration tool.** It generates advice based on simple logic and AI predictions. It is **not** a substitute for professional medical advice.
