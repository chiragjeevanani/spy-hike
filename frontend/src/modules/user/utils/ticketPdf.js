import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export async function downloadTicketPDF(booking) {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = '750px';
  container.style.backgroundColor = '#FFFFFF';
  container.style.padding = '32px';
  container.style.fontFamily = 'sans-serif';
  container.style.color = '#18181b';

  const leadHiker = booking.travelers?.[0]?.name || 'Registered Hiker';
  const travelers = booking.travelers?.length
    ? booking.travelers
    : [{ name: leadHiker, age: 'Adult', gender: 'Specified on ID', emergencyContact: 'Provided' }];

  container.innerHTML = `
    <div style="display: flex; items-center; justify-content: space-between; border-bottom: 2px solid #147347; padding-bottom: 16px; margin-bottom: 20px;">
      <div style="display: flex; align-items: center; gap: 14px;">
        <img src="/logo.png" style="width: 48px; height: 48px; object-fit: contain; border-radius: 10px;" alt="Find Your Trek" />
        <div>
          <h1 style="margin: 0; font-size: 20px; font-weight: 900; color: #147347; letter-spacing: 0.05em;">FIND YOUR TREK</h1>
          <p style="margin: 2px 0 0 0; font-size: 11px; color: #71717a; font-family: monospace;">BOARDING PASS & PERMIT DOSSIER · ${new Date().toISOString().split('T')[0]}</p>
        </div>
      </div>
      <div style="text-align: right;">
        <span style="display: inline-block; padding: 4px 12px; background-color: #14734715; color: #147347; border: 1px solid #14734740; font-size: 11px; font-weight: 800; border-radius: 9999px; text-transform: uppercase;">
          ${(booking.status || 'Upcoming').toUpperCase()}
        </span>
      </div>
    </div>

    <!-- Ticket Box -->
    <div style="border: 1px solid #e4e4e7; border-radius: 16px; overflow: hidden; background-color: #fcfdfc; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
      <div style="background-color: #147347; color: #ffffff; padding: 10px 16px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; font-weight: 800; letter-spacing: 0.1em;">
        <span>FINDYOURTREK · OFFICIAL TREK BOARDING PASS</span>
        <span>TREK PASS</span>
      </div>

      <div style="display: flex; position: relative;">
        <!-- Main Pane -->
        <div style="flex: 1; padding: 18px; space-y: 12px;">
          <div style="margin-bottom: 12px;">
            <span style="display: block; font-size: 9px; text-transform: uppercase; color: #a1a1aa; font-weight: 700; letter-spacing: 0.05em;">Hiker Name</span>
            <span style="display: block; font-size: 15px; font-weight: 900; text-transform: uppercase; color: #09090b;">${leadHiker}</span>
          </div>

          <div style="margin-bottom: 12px;">
            <span style="display: block; font-size: 9px; text-transform: uppercase; color: #a1a1aa; font-weight: 700; letter-spacing: 0.05em;">Expedition</span>
            <span style="display: block; font-size: 14px; font-weight: 800; color: #09090b;">${booking.tripName}</span>
            <span style="display: block; font-size: 11px; color: #71717a;">${booking.tripLocation || 'Himalayas, India'}</span>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 14px;">
            <div>
              <span style="display: block; font-size: 9px; text-transform: uppercase; color: #a1a1aa; font-weight: 700;">Departure</span>
              <span style="display: block; font-size: 12px; font-weight: 700; font-family: monospace;">${booking.selectedDate}</span>
            </div>
            <div>
              <span style="display: block; font-size: 9px; text-transform: uppercase; color: #a1a1aa; font-weight: 700;">Hikers</span>
              <span style="display: block; font-size: 12px; font-weight: 700;">${booking.travelersCount} Pax</span>
            </div>
            <div>
              <span style="display: block; font-size: 9px; text-transform: uppercase; color: #a1a1aa; font-weight: 700;">Organizer</span>
              <span style="display: block; font-size: 12px; font-weight: 700;">${booking.organizerName || 'Verified Treks'}</span>
            </div>
          </div>

          <div style="border-top: 1px dashed #e4e4e7; padding-top: 10px; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 10px; font-family: monospace; color: #71717a; letter-spacing: 0.15em;">PERMIT CODE: ${booking.bookingId || booking.id}</span>
            <span style="font-size: 9px; color: #147347; font-weight: 700; text-transform: uppercase;">SCAN AT BASE CAMP GATE</span>
          </div>
        </div>

        <!-- Stub -->
        <div style="width: 170px; border-left: 2px dashed #14734730; background-color: #f4f7f4; padding: 18px; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="margin-bottom: 10px;">
              <span style="display: block; font-size: 9px; text-transform: uppercase; color: #a1a1aa; font-weight: 700;">Permit Code</span>
              <span style="display: block; font-size: 12px; font-weight: 800; font-family: monospace; color: #147347;">${booking.bookingId || booking.id}</span>
            </div>
            <div style="margin-bottom: 10px;">
              <span style="display: block; font-size: 9px; text-transform: uppercase; color: #a1a1aa; font-weight: 700;">Date</span>
              <span style="display: block; font-size: 11px; font-weight: 700; font-family: monospace;">${booking.selectedDate}</span>
            </div>
            <div style="margin-bottom: 10px;">
              <span style="display: block; font-size: 9px; text-transform: uppercase; color: #a1a1aa; font-weight: 700;">Total Fare</span>
              <span style="display: block; font-size: 15px; font-weight: 900; color: #147347;">₹${booking.finalAmount}</span>
            </div>
          </div>
          <div style="font-size: 8px; color: #a1a1aa; font-family: monospace; text-align: center;">VERIFIED BOARDING PASS</div>
        </div>
      </div>
    </div>

    <!-- Hikers Roster -->
    <div style="margin-bottom: 20px;">
      <h3 style="margin: 0 0 8px 0; font-size: 12px; font-weight: 800; color: #147347; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1.5px solid #147347; padding-bottom: 4px;">Registered Hikers Roster</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
        ${travelers.map((t, idx) => `
          <tr style="border-bottom: 1px solid #f4f4f5;">
            <td style="padding: 6px 0; font-weight: 700;">${idx + 1}. ${t.name}</td>
            <td style="padding: 6px 0; color: #71717a;">Age: ${t.age && t.age !== 'null' ? t.age : '—'}</td>
            <td style="padding: 6px 0; color: #71717a;">Gender: ${t.gender && t.gender !== 'null' ? t.gender : '—'}</td>
            <td style="padding: 6px 0; color: #71717a; text-align: right;">Emergency: ${t.emergencyContact || 'On file'}</td>
          </tr>
        `).join('')}
      </table>
    </div>

    <!-- Bill Summary -->
    <div style="margin-bottom: 24px;">
      <h3 style="margin: 0 0 8px 0; font-size: 12px; font-weight: 800; color: #147347; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1.5px solid #147347; padding-bottom: 4px;">Settled Bill Summary</h3>
      <div style="display: flex; justify-content: space-between; font-size: 11px; padding: 4px 0; color: #52525b;">
        <span>Base Booking Fee</span>
        <span style="font-weight: 700;">₹${booking.finalAmount}</span>
      </div>
      ${booking.couponUsed ? `
        <div style="display: flex; justify-content: space-between; font-size: 11px; padding: 4px 0; color: #147347;">
          <span>Coupon Applied (${booking.couponUsed})</span>
          <span style="font-weight: 700;">- ₹${booking.couponDiscount}</span>
        </div>
      ` : ''}
      <div style="display: flex; justify-content: space-between; font-size: 11px; padding: 4px 0; color: #147347;">
        <span>Permit Royalties & Taxes</span>
        <span style="font-weight: 700;">${booking.taxAmount ? `₹${booking.taxAmount}` : 'Included'}</span>
      </div>
      <div style="border-top: 1px dashed #d4d4d8; margin: 6px 0; padding-top: 6px; display: flex; justify-content: space-between; font-size: 13px; font-weight: 900; color: #09090b;">
        <span>TOTAL AMOUNT CLEARED</span>
        <span style="color: #147347;">₹${booking.finalAmount}</span>
      </div>
    </div>

    <!-- Footer Policy -->
    <div style="font-size: 9px; color: #71717a; line-height: 1.5; border-top: 1px solid #f4f4f5; padding-top: 12px;">
      <p style="margin: 0 0 3px 0;"><strong>Booking Reference:</strong> ${booking.bookingId || booking.id} · Booked on: ${booking.bookingDate || new Date().toISOString().split('T')[0]}</p>
      <p style="margin: 0 0 3px 0;"><strong>Flexible Cancellation:</strong> 100% refund is eligible up to 48 hours prior to official departure date.</p>
      <p style="margin: 0;"><strong>Hiker Notice:</strong> Carry a government photo ID matching lead hiker name. Present this pass at base camp control.</p>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#FFFFFF'
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`FindYourTrek-BoardingPass-${booking.bookingId || booking.id}.pdf`);
  } catch (err) {
    console.error('Failed to generate PDF:', err);
  } finally {
    document.body.removeChild(container);
  }
}
