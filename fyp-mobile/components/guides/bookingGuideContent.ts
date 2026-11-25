import { packageCreationGuide } from './packageCreationGuide';

export type BookingGuideKind = 'clientEvents' | 'vendorEvents' | 'vendorOrders' | 'packageCreation';
export type GuideSection = { id: string; title: string; summary: string; steps: string[]; note?: string };
export type BookingGuide = { title: string; launchTitle?: string; launchHint?: string; footer?: string; introduction: string; quickSteps: string[]; sections: GuideSection[] };

const timing: GuideSection = {
  id: 'payment-time', title: 'Payment deadlines, made simple', summary: 'Read the exact deadline on each vendor booking.',
  steps: [
    'The payment clock starts when the vendor accepts, not when the client sends the booking request. The deadline is usually within 24 hours of acceptance, but can be earlier to leave time for preparation.',
    'Booking Notice requires at least 1 full day (24 hours) before the booked service starts. Vendors can set a longer notice in whole days. The payment deadline is separate; always follow the exact deadline shown on the booking.',
    'Example: if the service starts tomorrow at 3 PM, a new booking requiring 1 day notice must be requested by 3 PM today. Delivery or setup may start earlier than the event.',
    'Payment confirmation has its own time requirements. If there is not enough time to accept or pay, the app blocks the action. Follow the actual deadline and message shown for your booking.',
    'Delivery and setup times may be earlier than the event. Payment timing uses the booked service time, so always read the service details as well as the event time.',
  ], note: 'Payment must be confirmed in time. Submitting a payment is not the same as a successful payment. Refreshing or retrying does not extend a saved deadline.',
};
const status: GuideSection = {
  id: 'statuses', title: 'What each booking status means', summary: 'Each vendor has their own booking and payment status.',
  steps: [
    'New Pakistan packages use PKR and new USA packages use USD. Existing PKR packages and bookings keep their recorded currency. No automatic currency conversion is applied.',
    'Pending: the vendor has not accepted. Processing / Accepted: the vendor accepted, but any required advance payment still needs to be secured.',
    'Confirmed: the required advance is secured, or no advance is required. Check Paid and Remaining for the actual money received; a zero advance does not mean the whole package is paid.',
    'Completed: the vendor has marked the booked service as provided. Any outstanding balance is handled separately.',
    'Fully Paid: the service is complete and the remaining balance is zero.',
    'Cancelled or Rejected: this vendor booking will not proceed. Read the reason, cancellation details and any refund status.',
    'Request Expired / Payment Expired: the request or unpaid payment window ended. Closed bookings stay in history and cannot be accepted or paid through their old buttons.',
    'No longer assigned: this vendor was removed from the active assignment, for example after a replacement. The history remains.',
  ], note: 'One vendor accepting, completing, cancelling or expiring does not perform that action on the other vendors in the event.',
};
const service: GuideSection = {
  id: 'service-time', title: 'Event time and service time', summary: 'Check when this particular package is needed.',
  steps: [
    'Event dates, service times, requests, cancellation/refund updates and payment timestamps use the event city timezone shown on the booking, even when your phone is in another country.',
    'While a date/time change is unresolved, booking acceptance and payment stay unavailable. Accept New Schedule approves the proposed time; it does not accept the booking. Once the whole schedule is finalized, use Accept Package or Accept All Pending Packages if available.',
    'Event time is when the event starts. Service time is the booked work or delivery window for this package; these can differ.',
    'Duration-based packages have a booked start and end. Delivery-based packages use delivery timing. Setup-based packages include setup timing and the time needed to set up. Custom packages follow their saved timing details.',
    'Read the package name, inclusions, price, duration or delivery/setup window, address and service city before acting.',
    'Booking activity shows action dates and times with its displayed timezone. Use that timezone when comparing deadlines. Older history may say Time not recorded when the original timestamp was not saved.',
  ],
};
const delivery: GuideSection = {
  id: 'delivery', title: 'Delivery bookings', summary: 'Choose and check the exact delivery time and fee.',
  steps: [
    'Choose an available delivery date and time within the package’s earliest and latest times. Quick choices may include one hour before, thirty minutes before or at event start. No service duration is needed for delivery.',
    'Delivery time is separate from event time. Booking notice requires at least 24 hours before the delivery/service starts, or longer if set by the vendor. Read the date, time and displayed timezone; working hours, existing bookings and payment timing can also make a delivery time unavailable.',
    'Free Delivery has no delivery fee. Otherwise, review the base delivery fee and any extra weight fee before submitting. When extra weight charges apply, check the vendor’s selected unit: kg, g, lb or oz. Each started extra unit is charged at the shown rate. Delivery fees are charged once for that package booking, not once per guest.',
    'Check the package pricing method. Per Person charges for the selected people, initially your event guest count. Group Package shows the people included per group; change quantity for more groups. Fixed Package charges per package. Delivery fees are shown separately.',
    'Payment deadlines and request expiry follow the agreed delivery time. The vendor can mark delivery complete only once that time arrives and the required payment is secured. The remaining payment follows completion.',
    'When changing the event schedule, choose a new available delivery time for each delivery booking. The original schedule stays until the required approvals finish. Replacement packages have their own delivery times and charges.',
  ],
};
const laterClient: GuideSection = {
  id: 'later-time', title: 'Vendor asks for a later time', summary: 'Choose whether to reschedule, replace or continue without.',
  steps: [
    'If there is too little payment/preparation time, the vendor cannot accept normally. They can send a later-time request with a reason and an optional suggested event time.',
    'Review & reschedule: use the existing date/time request flow. A suggestion alone does not change the event; availability and the required vendor approvals are checked.',
    'Find replacement: the app checks whether another vendor can still be booked for the existing event time. If none is available, this button is unavailable; choose a later time or continue without this vendor. The original pending assignment stays in place while browsing. It becomes No longer assigned only after the replacement request is successfully created.',
    'Continue without this vendor: read the confirmation. Keep booking leaves it pending; confirming closes only that assignment and updates the event total.',
    'These choices are available only while the event is still in the future and their other checks pass. Only packages with enough time to book and prepare can be selected. A final check happens when you submit, because time or availability can change while you browse.',
  ], note: 'This later-time decision is for a pending unpaid booking. It does not itself charge a payment or apply a monetary cancellation penalty. Rescheduling may be unavailable if the event has already used its date/time request or has a successful payment.',
};

export const bookingGuides: Record<BookingGuideKind, BookingGuide> = {
  packageCreation: packageCreationGuide,
  clientEvents: {
    title: 'My Events · Client guide',
    introduction: 'Follow each vendor from booking request to service completion. Open a topic below for the steps you need.',
    quickSteps: ['Open event → review each vendor', 'Vendor accepts → check payment deadline', 'Service completed → settle remaining balance'],
    sections: [
      { id: 'start', title: 'Open and check your event', summary: 'Find the correct event and expand its vendor cards.', steps: [
        'Open My Events and expand the event. Check its date, time, city, address, guests and desired services.',
        'Each vendor appears once per event. Expand the vendor details for contact information and each package for its quantity, time, price, activity and payment status.',
        'Pull down to refresh after a payment, vendor response or schedule decision. Check notifications for updates, then open the booking to see its latest state.',
      ] }, status, service, delivery,
      { id: 'pay', title: 'Pay the down payment and remaining balance', summary: 'Use only the payment action shown on that booking.', steps: [
        'While a vendor is Pending, wait for their response. Once accepted, use Pay Down Payment if an advance is required. Check the amount and exact due date before proceeding.',
        'USD bookings use card payment. PKR bookings show the available card and local wallet methods.',
        'Choose the available payment method, enter the requested details, review and submit once. Awaiting confirmation means the payment is still pending; do not submit another payment.',
        'A successful advance shows Partially Paid. View Receipt opens recorded payment details. A failed payment can be retried only while the payment window remains open and no payment is pending.',
        'A zero down payment has no advance-payment button or deadline. Paid may still be zero, with the full booking amount remaining.',
        'After the vendor marks the service Completed, use Pay Remaining Amount when shown. Check the remaining-payment due date on the booking; it is separate from the advance deadline.',
      ] }, timing,
      { id: 'expiry', title: 'If a request or payment expires', summary: 'Know when the booking is no longer secured.', steps: [
        'A pending request cannot be accepted after its service has started. An accepted booking with no successful advance can expire when its payment deadline passes.',
        'If a submitted down payment is still awaiting confirmation when the preparation cutoff passes, Payment verification overdue — service not secured means the payment still needs to be checked. Do not treat it as a secured booking.',
        'If the failed/unpaid booking expires, its old Pay and Retry actions are unavailable and the record stays in history. Confirmed paid bookings are not expired simply because their old advance deadline passed.',
      ] },
      { id: 'reschedule', title: 'Request a different date or time', summary: 'Send a request, then follow each vendor’s response.', steps: [
        'When a vendor proposes new times for their pending packages, review each current and proposed slot in their card. Accept or decline the whole request there. For an entire event, use Request Date/Time Change before the event starts when available. The current flow permits one date/time request per event and only before any successful down payment.',
        'Choose the new date, time and duration, enter a reason, review and submit. The current booking does not change simply because the request was sent.',
        'Follow the response from every affected vendor. Their availability is checked for the requested schedule. When the required approvals are complete, refresh to see the resulting schedule.',
        'If a vendor is unavailable or a response expires, follow the choices shown: keep the original schedule, or continue with the requested schedule and replace unavailable vendors. Replacement must complete its own checks before the schedule is finalized.',
        'Continue without an unavailable vendor in the partial date/time-change flow may show an unavailable notice. Use only actions the screen currently supports; it is different from the unpaid later-time request described below.',
      ] }, laterClient,
      { id: 'cancel', title: 'Cancel a booking and follow a refund', summary: 'Review the saved policy before you confirm.', steps: [
        'Use Cancel Booking on the specific vendor booking. Read the cancellation preview: paid amount, refund percentage, refund amount and amount retained.',
        'Enter a meaningful reason and confirm only after checking the amounts. If the preview expires, reload it and review again. Refunds follow the policy saved with that booking.',
        'A refund due is not the same as a completed refund. Follow the recorded status and any reason for rejection. A zero refund has no positive refund amount to return.',
        'If the vendor cancels, read the booking’s refund details. When Find replacement or Continue without is available, it applies to that vendor; other vendor bookings remain in place.',
      ] },
      { id: 'messages-history', title: 'Messages, history and event removal', summary: 'Contact your vendor and keep decisions clear.', steps: [
        'Open Messages to see your conversations. Clients do not need a vendor subscription.',
        'Use Message on the relevant available booking to open that vendor’s conversation. Chatting alone does not change a date, payment or booking status.',
        'Review Booking history for closed bookings and recorded decisions. View chat history opens previous messages without sending new ones. If no messages were exchanged, the history screen shows No previous messages for this booking. Contact Support for help with refunds or penalties.',
        'Use the Today, Upcoming and Past tabs to see event counts and switch lists. Use Event options to duplicate event details into a new form.',
      ] },
    ],
  },
  vendorEvents: {
    title: 'My Events · Vendor guide',
    introduction: 'Use this screen to manage availability and review your own bookings. Booking actions are handled in Order Summary.',
    quickSteps: ['Choose a date → check remaining capacity', 'Edit availability → save and recheck', 'Tap a booking → manage that order in Order Summary'],
    sections: [
      { id: 'calendar', title: 'Find a day and review bookings', summary: 'Use the calendar and the available views.', steps: [
        'Pick a date in the month calendar to see working hours, booking notice and simultaneous booking limit. A blocked date shows your saved reason when you entered one.',
        'Tap Total, Upcoming or Pending above the calendar, or use the counted filters above the event list. Open order takes you to Order Summary for details and actions.',
        'Event cards show the package count, booking total, Received and Pending amounts. Chat and Call are available where contact details permit.',
        'Only your vendor bookings are shown here. Another vendor’s acceptance or cancellation does not change your own assignment.',
      ] },
      { id: 'availability', title: 'Edit working hours and notice', summary: 'Save the settings for the intended working day.', steps: [
        'Use Edit availability. Check the day, enabled/disabled working days, working windows, blocked dates and booking notice before saving.',
        'In Block dates, select today or a future date. For several days, turn on Block a date range, choose Start and End on the calendar, then tap Apply range. You can edit either date before applying. Customers can see any optional reason you enter.',
        'Booking Notice is at least 1 full day (24 hours) before the service starts, not necessarily the event start. Choose 1, 2, 3, 5, 7, 14 or 30 days in availability settings; a specific day can have its own notice. Save and recheck the selected day.',
        'Normal working windows must be at least one hour; a start such as 6:30 PM is allowed if the window is long enough. Vendors with eligible active delivery/setup packages can use shorter minute-based windows.',
        'A remaining 30-minute segment on the calendar does not mean a one-hour package can fit there. The package’s complete required window must fit inside working hours.',
        'Availability is checked again when booking. Legacy notice values below 1 day do not override the 24-hour minimum. Existing reservations, blocked dates, working hours and simultaneous-booking limits can also affect availability.',
      ], note: 'Changing availability does not cancel an existing customer booking. Accepted bookings keep their saved payment deadline; changing notice is not a way to extend it.' },
      { id: 'booking-limit', title: 'Maximum bookings at the same time', summary: 'Set how many overlapping bookings your team can handle.', steps: [
        'Go to Your Availability and tap Edit availability. Find Maximum bookings at the same time above Working Days.',
        'Use the minus and plus buttons to set your limit. Choose 1 for one booking at a time, or 2 if your team can handle two bookings during the same hours.',
        'Tap Save Availability. The limit applies across all your packages, including multiple packages in the same order.',
        'Green means free and red means a slot has an existing booking. A red slot may still have room under your simultaneous booking limit. The counts show free and booked slots.',
        'Blocked dates are red and crossed out. Select a grey past date to see its bookings. Availability slots are shown for today and future dates.',
        'Tap the timeline or Show all slots to see hourly rows for both available and booked times. Booked slots group packages from the same order. An over-limit note appears on the hourly row only when the booking limit is exceeded.',
      ] },
      service, delivery, status, timing,
      { id: 'manage', title: 'Take action in Order Summary', summary: 'Review and respond to the correct vendor booking.', steps: [
        'Tap Open order on an event card to view it in Order Summary.',
        'Open My Orders / Order Summary to accept, review schedule changes, request a later time, cancel or mark a service completed when those actions are available.',
        'Prices use the saved booking currency: PKR for Pakistan or USD for USA. Older PKR bookings keep their currency.',
        'Check the client, package and booked service window before responding. If acceptance is blocked for insufficient time, use Request later service time rather than treating the booking as accepted.',
        'For completion and payment status, open the User Guide in Order Summary.',
      ] },
      { id: 'subscription', title: 'If your subscription expires', summary: 'Continue managing legitimate existing bookings.', steps: [
        'Subscription expiry affects access to subscription features and visibility to new clients. It does not automatically cancel existing customer bookings.',
        'Open My Orders to manage existing bookings. If Messages shows a booking-messages notice, open the relevant valid booking and tap Message to contact its client.',
        'Cancelled, expired or no-longer-assigned bookings offer View chat history and Contact Support. You cannot send new messages from these closed bookings. A separate valid booking with the same client can still offer Message.',
      ] },
    ],
  },
  vendorOrders: {
    title: 'Order Summary · Vendor guide',
    introduction: 'Manage your own assignment, understand payment deadlines and respond clearly to your client.',
    quickSteps: ['Expand order → review package and service time', 'Accept in time → check payment status', 'Fulfil service → mark completed when allowed'],
    sections: [
      { id: 'orders', title: 'Read your Order Summary', summary: 'Use the filter chips and expand an order for package details.', steps: [
        'Open My Orders and swipe the filter chips to see more statuses. Tap a chip to filter the list. The text and icon on each card identify its status.',
        'The collapsed card shows the event schedule, package count, Received, Pending and the next scheduled completion when available.',
        'Expand the order to see the address, package slots and payment progress. Tap the address to open Maps, or tap a package to see quantity and pricing.',
        'Received is the recorded amount paid by the client. Pending is the unpaid balance. Net booking value appears when a platform fee applies.',
        'Open History at the bottom for the order ID, booking activity and the event city timezone. Pull down to refresh recent changes.',
      ] },
      { id: 'statuses', title: 'Booking status and Closed orders', summary: 'Check the order chip and each package’s status.', steps: [
        'Pending means a request is awaiting acceptance. Processing means the vendor accepted and the required advance is still being secured. Confirmed means the booking is secured.',
        'Accepted applies to the package. Completed means the vendor marked the service as provided. Check the separate payment chip for the recorded balance.',
        'Closed groups Request Expired, Payment Expired and No Longer Assigned. Each card shows its specific status. Cancelled orders have their own filter.',
        'Request Expired means the request window ended. Payment Expired means the payment window ended. No Longer Assigned means the booking is no longer assigned to you. Open a closed order for details, chat history or support.',
      ] }, service, delivery,
      { id: 'accept', title: 'Accept a new request', summary: 'Review the slots before accepting pending packages.', steps: [
        'Use Accept Package for one pending package or Accept All Pending Packages for several. Review the slots in the confirmation. If any package fails the check, the entire acceptance is rolled back.',
        'If successful, your booking becomes Processing / Accepted. The client sees the required advance and its exact deadline. Acceptance alone does not mean money has been paid.',
        'If too little time remains, acceptance is blocked and the booking stays Pending. Use Request new date & time to preview each eligible package’s old and new slot and send one request to the client. The client can approve or decline in My Events.',
      ] }, timing,
      { id: 'payment', title: 'Understand payment and expiry', summary: 'Confirm the booking’s status before providing service.', steps: [
        'Payment Required means the client still needs to secure the advance. Awaiting confirmation means a payment was submitted but has not become successful.',
        'The package payment chip shows whether payment is required, Partially paid or Fully paid. Fully paid means the recorded balance is zero. The Fully Paid filter lists completed orders with all packages paid.',
        'An unpaid booking can expire at its payment deadline. A pending payment past the preparation cutoff is overdue and the service is not secured; do not treat it as paid.',
        'Request Expired and No longer assigned records are kept for history. They do not offer acceptance, completion or new messages. View chat history lets you read previous messages; Contact Support is available for help. Payment expiry for one assignment does not expire other vendors.',
        'After service completion, the client handles any remaining balance using the displayed remaining-payment deadline. Refresh to check the recorded result.',
      ] },
      { id: 'later', title: 'Ask the client for a later time', summary: 'Send a request without changing the event yourself.', steps: [
        'After acceptance is blocked for insufficient time, open Request later service time on that pending unpaid booking.',
        'Enter a reason. Use the date and time buttons to suggest a new event time. Choose both, or leave both empty; the event-city timezone applies.',
        'Send once. The client can review and reschedule, find a replacement for the current event time, or continue without your assignment. Availability and existing restrictions still apply.',
        'If the client confirms your exact suggested time and the same duration, you do not need to approve it again. A different time still needs your review. Other vendors must agree too if they are affected. Follow the request status and recorded client decision time. A replacement or continue-without decision closes only your assignment.',
        'These actions are restricted to before the event starts. The same pending request cannot be repeatedly created to send duplicate updates.',
      ] },
      { id: 'reschedule', title: 'Respond to a client’s date/time request', summary: 'Review the proposed schedule before agreeing.', steps: [
        'Open the amber Review Reschedule Request card. Compare the current and proposed package slots and check the reason. Once applied, the compact Rescheduled banner shows the date change. Tap it to review the old and new package slots.',
        'Confirm availability if you can fulfil the new schedule, or choose the unavailable response if you cannot. Availability is checked again; a message in chat is not an approval.',
        'Your response applies only to your assignment. In a multi-vendor event, follow the group result; the original schedule remains until the required decisions or replacement steps complete.',
        'If the client keeps the original schedule, continue with the original booking. If they replace your assignment, read No longer assigned and the resulting history before taking further action.',
      ] },
      { id: 'cancel', title: 'Cancel your assignment responsibly', summary: 'Review the cancellation preview and enter a reason.', steps: [
        'Open the ⋯ menu and select the package to cancel. Review the payment, client refund and any vendor penalty before confirming.',
        'Enter the required reason, reload an expired preview if needed, then confirm. Only your assignment is cancelled; the event and other vendors remain.',
        'Pending or unpaid cancellations have no monetary vendor penalty under the current rule. For bookings with successful payment, the saved cancellation policy and notice determine any penalty.',
        'Client refunds and vendor penalties are different amounts. Follow their recorded status and decision details; a refund request is not proof the refund has completed.',
      ] },
      { id: 'complete-chat', title: 'Complete service and contact the client', summary: 'Finish only your work, then check the remaining payment.', steps: [
        'Use Call or Email in the Organizer card when those contact details are available. Tap Chat to open the in-app conversation.',
        'The disabled Mark as Completed button shows a countdown and the exact service end or scheduled delivery time in the event city timezone. The action becomes available when that time arrives and any required advance is secured. If payment is still pending, the button explains the payment requirement. Tap Mark as Completed and confirm after providing the service.',
        'Completion applies only to your vendor booking. If money remains, the client gets the remaining-payment action and its separate deadline; completion does not itself mark the balance paid.',
        'Tap Fully Paid Orders on the Vendor Dashboard or Fully Paid in Order Summary to see completed orders with no balance left.',
        'If your subscription is inactive, manage valid existing bookings through My Orders and open Chat in the Organizer card. The general Messages list can be restricted. Expiry of your subscription does not itself cancel customer bookings.',
      ] },
    ],
  },
};
