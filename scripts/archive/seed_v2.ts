import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// טעינת משתני הסביבה מקובץ ה-.env.local של הפרויקט
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // השתמש ב-Service Role כדי לעקוף RLS

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ שגיאה: משתני הסביבה של Supabase לא נמצאו ב-.env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedTaxonomyV2() {
  console.log("🚀 מתחיל תהליך הזרקת הנתונים...");

  try {
    // קריאת הקובץ מהתיקייה שבה הוא נמצא (שורש הפרויקט)
    const filePath = path.resolve(process.cwd(), 'nayeret_document_taxonomy_v2_israel_us_global.json');
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`קובץ ה-JSON לא נמצא בנתיב: ${filePath}`);
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileContent);

    if (!data.documents || !Array.isArray(data.documents)) {
      throw new Error("מבנה קובץ ה-JSON לא תקין - חסר מערך 'documents'");
    }

    console.log(`📦 נמצאו ${data.documents.length} סוגי מסמכים לעדכון. מתחיל UPSERT...`);

    for (const doc of data.documents) {
      const { error } = await supabase
        .from('document_types')
        .upsert({
          name: doc.taxonomy,
          doc_group: doc.group,
          ui_category: doc.ui_category,
          matching_description: doc.matching_description,
          semantic_signals: doc.semantic_signals,
          schema_definition: { extraction_schema: doc.extraction_schema }
        }, { onConflict: 'name' });

      if (error) {
        console.error(`❌ שגיאה בעדכון ${doc.taxonomy}:`, error.message);
      } else {
        process.stdout.write("."); // הדפסת נקודה לכל הצלחה כדי לראות התקדמות
      }
    }

    console.log('\n✅ תהליך ה-Seed הסתיים בהצלחה!');
  } catch (err) {
    console.error("💥 שגיאה קריטית במהלך ההרצה:");
    console.error(err);
    process.exit(1);
  }
}

seedTaxonomyV2();