import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { parse } from 'csv-parse/sync';

// טעינת משתני סביבה מקובץ ה-.env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// הגדרת מבנה הנתונים של שורת ה-CSV למניעת שגיאות TypeScript
interface CsvRow {
  name: string;
  display_name_he: string;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ שגיאה: משתני הסביבה של Supabase לא נמצאו ב-.env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateHebrewNames() {
  console.log("🔄 מתחיל עדכון שמות בעברית מה-CSV...");

  try {
    // איתור קובץ ה-CSV בתיקיית השורש של הפרויקט
    const filePath = path.resolve(process.cwd(), 'document_types_rows_with_he_name.csv');
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`קובץ ה-CSV לא נמצא בנתיב: ${filePath}`);
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // קריאת ה-CSV והמרה למערך של אובייקטים מסוג CsvRow
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    }) as CsvRow[];

    console.log(`📋 נמצאו ${records.length} שורות לעדכון בטבלת document_types.`);

    for (const record of records) {
      // עדכון העמודה display_name_he עבור השורה עם השם התואם
      const { error } = await supabase
        .from('document_types')
        .update({ display_name_he: record.display_name_he })
        .eq('name', record.name);

      if (error) {
        console.error(`❌ שגיאה בעדכון ${record.name}:`, error.message);
      } else {
        process.stdout.write("."); // חיווי התקדמות בטרמינל
      }
    }

    console.log('\n✅ עדכון השמות בעברית הסתיים בהצלחה!');
  } catch (err) {
    console.error("💥 שגיאה קריטית במהלך העדכון:");
    console.error(err);
    process.exit(1);
  }
}

updateHebrewNames();