# DropOutHacks Certificate Generator Backend

Brief backend service for generating participation certificates as PDFs.

## Tech Stack

- Runtime: Node.js
- Framework: Express.js
- Data source: CSV file (`data/participants.csv`)
- PDF generation: `pdf-lib` + `@pdf-lib/fontkit`
- Middleware: `cors`, `express.json()`
- Dev tool: `nodemon`

## Project Structure

```
backend/
|- data/
|  |- participants.csv
|- templates/
|  |- config.json
|  \- fonts/
|- output/
|  \- .gitkeep
|- src/
|  |- app.js
|  |- controllers/
|  |  \- certificateController.js
|  |- middleware/
|  |  \- errorHandler.js
|  |- routes/
|  |  \- certificateRoutes.js
|  |- services/
|  |  |- csvService.js
|  |  \- pdfService.js
|  \- utils/
|     \- fileHelper.js
|- server.js
|- package.json
\- README.md
```

Layer roles (brief):

- `controllers`: Request handling and response shaping
- `services`: CSV reading and PDF generation business logic
- `routes`: API route definitions
- `middleware`: Centralized error handling
- `utils`: Shared path/constants helpers

## API Endpoints

- `GET /`
  - Health check
- `GET /api/check-email?email=...`
  - Checks if email exists and whether the participant is eligible
- `POST /api/generate-certificate`
  - Body: `{ "email": "user@example.com" }`
  - Returns generated certificate as a PDF file

## Eligibility Rules

Only users with role `Participant` or `Finalist` can receive certificates.

## Run Locally

1. Install dependencies:
   - `npm install`
2. Start server:
   - `npm start`
3. Development mode:
   - `npm run dev`

Server runs on `http://localhost:5000` by default.
