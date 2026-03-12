import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    // Extract SMS/MMS data from Twilio
    const fromPhone = formData.get('From') as string;
    const messageBody = formData.get('Body') as string || '';
    const numMedia = parseInt(formData.get('NumMedia') as string || '0');

    // Get media URLs if present
    const mediaUrls: string[] = [];
    for (let i = 0; i < numMedia; i++) {
      const mediaUrl = formData.get(`MediaUrl${i}`) as string;
      const mediaContentType = formData.get(`MediaContentType${i}`) as string;
      if (mediaUrl) {
        mediaUrls.push(mediaUrl);
        console.log(`Media ${i}: ${mediaContentType} - ${mediaUrl}`);
      }
    }

    console.log('Received SMS/MMS response:', {
      fromPhone,
      messageBody,
      numMedia,
      mediaUrls
    });

    if (!fromPhone || !messageBody) {
      console.error('Missing required SMS data');
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
    }

    // Find the pending daily log request for this phone number
    const { data: requests, error } = await supabase
      .from('daily_log_requests')
      .select(`
        *,
        project:projects(name, client_name)
      `)
      .eq('pm_phone_number', fromPhone)
      .eq('request_status', 'sent')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching daily log requests:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!requests || requests.length === 0) {
      console.log('No pending daily log request found for phone number:', fromPhone);
      return NextResponse.json({ message: 'No pending request found' });
    }

    const request = requests[0];

    // Download and save media files if present
    const savedMediaUrls: string[] = [];
    if (mediaUrls.length > 0) {
      console.log(`Downloading ${mediaUrls.length} media files...`);

      for (let i = 0; i < mediaUrls.length; i++) {
        const mediaUrl = mediaUrls[i];

        try {
          // Download the image from Twilio
          const twilioAuth = Buffer.from(
            `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
          ).toString('base64');

          const imageResponse = await fetch(mediaUrl, {
            headers: {
              'Authorization': `Basic ${twilioAuth}`
            }
          });

          if (!imageResponse.ok) {
            console.error(`Failed to download media ${i}:`, imageResponse.statusText);
            continue;
          }

          const imageBuffer = await imageResponse.arrayBuffer();
          const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
          const extension = contentType.split('/')[1] || 'jpg';

          // Generate file path: daily-logs/{project_id}/{date}/{timestamp}-{index}.{ext}
          const timestamp = Date.now();
          const fileName = `${timestamp}-${i}.${extension}`;
          const filePath = `${request.project_id}/${request.request_date}/${fileName}`;

          console.log(`Uploading to Supabase Storage: ${filePath}`);

          // Upload to Supabase Storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('daily-log-photos')
            .upload(filePath, Buffer.from(imageBuffer), {
              contentType: contentType,
              upsert: false
            });

          if (uploadError) {
            console.error(`Upload error for media ${i}:`, uploadError);
            continue;
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('daily-log-photos')
            .getPublicUrl(filePath);

          savedMediaUrls.push(publicUrl);
          console.log(`Successfully saved media ${i}: ${publicUrl}`);

        } catch (error) {
          console.error(`Error processing media ${i}:`, error);
        }
      }
    }

    // Update the request with the received notes and media
    const { error: updateError } = await supabase
      .from('daily_log_requests')
      .update({
        request_status: 'received',
        received_notes: messageBody.trim(),
        received_media_urls: savedMediaUrls.length > 0 ? savedMediaUrls : null,
        received_at: new Date().toISOString()
      })
      .eq('id', request.id);

    if (updateError) {
      console.error('Error updating daily log request:', updateError);
      return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
    }

    console.log(`Successfully received daily log for project: ${request.project.name}`);

    // Send confirmation SMS back to the PM
    const confirmationMessage = `Thank you! Your daily log for project "${request.project.name}" has been received and recorded.`;

    // You can implement sending a confirmation SMS here if needed
    // await sendSMS(fromPhone, confirmationMessage);

    return NextResponse.json({
      message: 'Daily log received successfully',
      project_name: request.project.name,
      notes: messageBody.trim()
    });

  } catch (error) {
    console.error('Error processing daily log response:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 