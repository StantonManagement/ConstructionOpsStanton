import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// GET: Fetch user preferences
// Note: For now returns default preferences. To implement per-user prefs, 
// add authentication and user_id from session
export async function GET(req: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    // TODO: Get user_id from auth session to fetch per-user preferences
    // For now, return default preferences (localStorage handles persistence)
    return NextResponse.json({
      emailNotifications: true,
      smsNotifications: true,
      darkMode: false,
    });
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user preferences' },
      { status: 500 }
    );
  }
}

// POST: Create or update user preferences
export async function POST(req: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    const preferences = await req.json();

    // TODO: Get user_id from auth session
    // For now, just return the preferences (localStorage will persist them)
    /* 
    const dbPreferences = {
      user_id: user.id,
      email_notifications: preferences.emailNotifications,
      sms_notifications: preferences.smsNotifications,
      dark_mode: preferences.darkMode,
    };

    const { data, error } = await supabase
      .from('user_preferences')
      .upsert(dbPreferences, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) {
      throw error;
    }
    */

    // For now, just echo back the preferences
    return NextResponse.json(preferences);
  } catch (error) {
    console.error('Error saving user preferences:', error);
    return NextResponse.json(
      { error: 'Failed to save user preferences' },
      { status: 500 }
    );
  }
}

