import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';

// GET /api/punch-lists/items/[itemId]/photos - Fetch all photos for a punch list item
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    const { itemId } = await params;

    const { data, error } = await supabaseAdmin
      .from('punch_list_photos')
      .select('*')
      .eq('punch_list_item_id', itemId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Punch List Photos GET] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[Punch List Photos GET] Exception:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/punch-lists/items/[itemId]/photos - Upload photo
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    const { itemId } = await params;

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const uploadedBy = formData.get('uploadedBy') as string; // 'contractor' or 'gc'
    const caption = formData.get('caption') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!uploadedBy || !['contractor', 'gc'].includes(uploadedBy)) {
      return NextResponse.json({ error: 'Invalid uploadedBy value' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size must be less than 10MB' }, { status: 400 });
    }

    // Get punch list item to get project_id for storage path
    const { data: punchItem, error: punchError } = await supabaseAdmin
      .from('punch_list_items')
      .select('project_id')
      .eq('id', itemId)
      .single();

    if (punchError || !punchItem) {
      return NextResponse.json({ error: 'Punch list item not found' }, { status: 404 });
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `punch-lists/${punchItem.project_id}/${itemId}/${timestamp}_${sanitizedName}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('construction-photos')
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('[Punch List Photo Upload] Error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload photo' }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('construction-photos')
      .getPublicUrl(filename);

    // Insert photo record
    const { data: photo, error: dbError } = await supabaseAdmin
      .from('punch_list_photos')
      .insert({
        punch_list_item_id: parseInt(itemId),
        photo_url: publicUrl,
        uploaded_by: uploadedBy,
        caption: caption || null,
      })
      .select()
      .single();

    if (dbError) {
      console.error('[Punch List Photo DB] Error:', dbError);
      // Clean up uploaded file
      await supabaseAdmin.storage.from('construction-photos').remove([filename]);
      return NextResponse.json({ error: 'Failed to save photo metadata' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: photo }, { status: 201 });
  } catch (error) {
    console.error('[Punch List Photos POST] Exception:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/punch-lists/items/[itemId]/photos/[photoId] would go in a separate file
// For now, we can delete via the main photos table if needed

