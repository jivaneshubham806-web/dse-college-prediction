# Maharashtra DSE College Finder

**What it does:** It helps DSE (Direct Second Year Engineering) students in Maharashtra find engineering colleges. Students enter their diploma percentage, branch, category and preferred cities, and the site shows colleges whose past CAP cutoffs are close to their percentage. It uses the official Maharashtra CET Cell CAP cutoff records.

**Main features:**
- **College Predictor:** shows colleges that match the student's percentage, branch, category and cities. Each college is labelled Good Chance, Moderate Chance or Borderline, based on its latest actual CAP cutoff.
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
  - `services/`: loads the CSV data and filters it for the predictor
  - `utils/`: PDF makers
  - `types/`: type definitions

**Data:** The file `cleaned_dse_cutoff_data_with_predictions.csv` has these columns: Institute Code, Institute, Department, Category, Year, CAP1, CAP2, CAP3, Latest Cutoff and Predicted CAP3. The predictor uses only the actual CAP cutoffs (the latest cutoff is CAP3, or CAP2 or CAP1 if CAP3 is missing). The Predicted CAP3 column is shown as information and does not affect the results.

**How the predictor filters colleges:**
1. Keeps rows that match the selected branch and category.
2. Keeps only the selected cities, if any are chosen.
3. Removes duplicate rows for the same college and branch.
4. Keeps colleges whose latest cutoff is between (student's percentage minus 4) and (student's percentage plus 6).
5. Labels each college:
   - **Good Chance:** cutoff is up to 4 points below the student's percentage.
   - **Moderate Chance:** cutoff is from the student's percentage up to 2 points above it.
   - **Borderline:** cutoff is more than 2 points above the student's percentage, up to 6 points above.

**How to run it on your computer:**
1. Install Node.js.
2. Open the project folder in a terminal.
3. Run `npm install`.
4. Run `npm run dev`.
5. Open http://localhost:3000 in your browser.

**Other commands:**
- `npm run build`: makes the final version for hosting.
- `npm run preview`: previews the final version.

**Note:** Results are based on past CAP cutoff records. They are not official admission guarantees. Students should check the official Maharashtra CET Cell website before making decisions.
