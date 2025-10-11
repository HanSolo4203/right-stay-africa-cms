import { NextRequest, NextResponse } from 'next/server';
import { detectColumnMappings, CSV_COLUMN_MAPPINGS } from '@/lib/csv-column-mappings';

/**
 * API endpoint to analyze a CSV file and detect column mappings
 * This helps users understand what columns were detected before importing
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Read CSV and get headers
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      return NextResponse.json(
        { success: false, error: 'CSV file is empty' },
        { status: 400 }
      );
    }

    // Parse headers
    const headers = lines[0].split(',').map(h => h.trim());
    
    // Detect column mappings
    const detectedMappings = detectColumnMappings(headers);
    
    // Separate into detected and missing
    const detected: { field: string; csvColumn: string; required: boolean }[] = [];
    const missing: { field: string; required: boolean; suggestions: string[] }[] = [];
    
    const requiredFields = ['property_id', 'booking_reference', 'guest_name', 'check_in_date', 'check_out_date', 'accommodation_total'];
    
    for (const [field, csvColumn] of Object.entries(detectedMappings)) {
      const isRequired = requiredFields.includes(field);
      
      if (csvColumn) {
        detected.push({
          field,
          csvColumn,
          required: isRequired,
        });
      } else {
        missing.push({
          field,
          required: isRequired,
          suggestions: CSV_COLUMN_MAPPINGS[field as keyof typeof CSV_COLUMN_MAPPINGS] || [],
        });
      }
    }

    // Parse first data row as sample
    const sampleData: { [key: string]: string } = {};
    if (lines.length > 1) {
      const values = lines[1].split(',').map(v => v.trim());
      headers.forEach((header, index) => {
        sampleData[header] = values[index] || '';
      });
    }

    return NextResponse.json({
      success: true,
      analysis: {
        totalHeaders: headers.length,
        headers,
        detectedMappings: detected,
        missingMappings: missing,
        missingRequiredFields: missing.filter(m => m.required),
        sampleData,
        rowCount: lines.length - 1, // Exclude header
      }
    });

  } catch (error) {
    console.error('Error analyzing CSV:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to analyze CSV file' },
      { status: 500 }
    );
  }
}

