import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseClient";
import { withAuth } from "@/lib/apiHelpers";

export const POST = withAuth(async (request: NextRequest, user: any) => {
  try {
    // Ensure admin client is available (should always be true in API routes)
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server configuration error: Admin client not available' },
        { status: 500 }
      );
    }
    
    // User is authenticated via withAuth wrapper
    console.log('[Delete API] Authenticated user:', user.id);

    // Get payment application IDs from request
    const { paymentAppIds } = await request.json();

    if (!paymentAppIds || !Array.isArray(paymentAppIds) || paymentAppIds.length === 0) {
      return NextResponse.json(
        { error: "Invalid request - paymentAppIds array required" },
        { status: 400 }
      );
    }

    const results = {
      success: [] as number[],
      failed: [] as { id: number; error: string }[]
    };

    // Log start of deletion process
    console.log(`[Delete API] Starting deletion of ${paymentAppIds.length} payment app(s)`);

    // Delete each payment application and its related records
    for (const paymentAppId of paymentAppIds) {
      console.log(`[Delete API] Processing payment app #${paymentAppId}`);
      
      try {
        // Delete related records first (foreign key constraints)
        // Using service role client to bypass RLS
        
        // 1. Delete payment_line_item_progress
        console.log(`  - Deleting line item progress for #${paymentAppId}...`);
        const { error: progressError, count: progressCount } = await supabaseAdmin
          .from("payment_line_item_progress")
          .delete()
          .eq("payment_app_id", paymentAppId);

        if (progressError) {
          console.error(`  ✗ Error deleting line item progress:`, progressError);
          results.failed.push({ id: paymentAppId, error: progressError.message });
          continue;
        }
        console.log(`  ✓ Deleted ${progressCount || 0} line item progress record(s)`);

        // 2. Delete payment_sms_conversations
        console.log(`  - Deleting SMS conversations for #${paymentAppId}...`);
        const { error: smsError, count: smsCount } = await supabaseAdmin
          .from("payment_sms_conversations")
          .delete()
          .eq("payment_app_id", paymentAppId);

        if (smsError) {
          console.error(`  ✗ Error deleting SMS conversations:`, smsError);
          results.failed.push({ id: paymentAppId, error: smsError.message });
          continue;
        }
        console.log(`  ✓ Deleted ${smsCount || 0} SMS conversation(s)`);

        // 3. Delete payment_documents
        console.log(`  - Deleting documents for #${paymentAppId}...`);
        const { error: docsError, count: docsCount } = await supabaseAdmin
          .from("payment_documents")
          .delete()
          .eq("payment_app_id", paymentAppId);

        if (docsError) {
          console.error(`  ✗ Error deleting documents:`, docsError);
          results.failed.push({ id: paymentAppId, error: docsError.message });
          continue;
        }
        console.log(`  ✓ Deleted ${docsCount || 0} document(s)`);

        // 4. Finally, delete the payment application itself
        console.log(`  - Deleting payment application #${paymentAppId}...`);
        const { error: appError } = await supabaseAdmin
          .from("payment_applications")
          .delete()
          .eq("id", paymentAppId);

        if (appError) {
          console.error(`  ✗ Error deleting payment application:`, appError);
          results.failed.push({ id: paymentAppId, error: appError.message });
          continue;
        }

        console.log(`  ✓ Payment app #${paymentAppId} deleted successfully`);
        results.success.push(paymentAppId);
      } catch (error) {
        console.error(`  ✗ Unexpected error deleting payment #${paymentAppId}:`, error);
        results.failed.push({
          id: paymentAppId,
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }

    // Log final results
    console.log(`[Delete API] Deletion complete: ${results.success.length} succeeded, ${results.failed.length} failed`);

    return NextResponse.json({
      success: results.success.length > 0,
      successCount: results.success.length,
      failedCount: results.failed.length,
      results
    });

  } catch (error) {
    console.error("Error in delete endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});

