# Maharashtra DSE College Finder

**What it does:** It helps DSE (Direct Second Year Engineering) students in Maharashtra find engineering colleges. Students enter their diploma percentage, branch, category and preferred cities, and the site shows colleges where they have a good chance of admission. It uses the official Maharashtra CET Cell CAP cutoff records.

**Main features:**
- **College Predictor:** shows colleges that match the student's percentage, branch, category and cities.
- **Cutoff Explorer:** shows the cutoff history of any college and branch (CAP1, CAP2, CAP3 and latest cutoff).
- **PDF download:** the student can download their options list, city-wise list, basic college list and CAP round lists as PDF files.

**Built with:** React, TypeScript, Vite, Tailwind CSS, PapaParse (reads the CSV data), jsPDF (makes the PDFs).

**Folder structure:**
- `index.html`: the main web page
- `package.json`: the list of libraries and commands
- `public/`: holds the data file `cleaned_dse_cutoff_data_with_predictions.csv`
- `src/`: all the app code
  - `App.tsx`: home page and screen switching
  - `components/`: the two main screens (Predictor and Cutoff Explorer)
  - `data/`: college names and cities
  - `services/`: loads the CSV data
  - `utils/`: PDF makers
  - `types/`: type definitions

**Data:** The file `cleaned_dse_cutoff_data_with_predictions.csv` has these columns: Institute Code, Institute, Department, Category, Year, CAP1, CAP2, CAP3, Latest Cutoff and Predicted CAP3.

**How to run it on your computer:**
1. Install Node.js.
2. Open the project folder in a terminal.
3. Run `npm install`.
4. Run `npm run dev`.
5. Open http://localhost:3000 in your browser.

**Other commands:**
- `npm run build`: makes the final version for hosting.
- `npm run preview`: previews the final version.

**Note:** Predictions are estimates based on past data, not official results. Students should check the official Maharashtra CET Cell website before making decisions.
