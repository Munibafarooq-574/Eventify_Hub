import type { BookingGuide } from './bookingGuideContent';

export const packageCreationGuide: BookingGuide = {
  title: 'Create a Package',
  launchTitle: 'Package Guide',
  launchHint: 'Step-by-step help with pricing, capacity and saving',
  introduction: 'Use this guide while filling out Add New Package. Choose the options that match how you charge, how many people you can serve, and when you can do the work.',
  quickSteps: [
    'Name the package and list what the client receives.',
    'Choose a pricing method, enter the rate, and set any capacity limits.',
    'Choose a booking type and fill in its timing details.',
    'Add images, check Live Preview, and tap Save Package.',
  ],
  sections: [
    {
      id: 'package-details',
      title: 'Describe your package',
      summary: 'Give clients a clear name, description and list of inclusions.',
      steps: [
        'Enter a specific Package Name, such as Event Makeup Package or 4-Hour Photography Coverage.',
        'Fill in the required Description field. Explain who the package is for and what the service covers.',
        'Fill in the required What’s Included field with the services or items covered by the price. Mention any extras the client would pay for separately.',
      ],
    },
    {
      id: 'package-pricing',
      title: 'Choose how to charge',
      summary: 'Set a price per package, per person or per group.',
      steps: [
        'Fixed Package charges for each package booked. For example, a $120 rental package costs $240 when a client books two vehicles.',
        'Per Person charges for each person receiving the service. Enter the rate for one person. For example, $80 per person for two makeup clients costs $160.',
        'Group Package charges for each group. Enter the price for one group and fill in People included per group. At $200 for up to six people per group, seven people need two groups and cost $400.',
        'Enter the amount in the currency shown beside the price field. Use one of the pricing methods shown for your category.',
      ],
    },
    {
      id: 'package-capacity',
      title: 'Set service capacity',
      summary: 'Limit who you can serve and how many resources you can provide.',
      steps: [
        'Choose People for a per-person service, Groups for a Group Package, Vehicles for rentals, Teams for crew-based work, or Setups for equipment or installations.',
        'Use Maximum people per booking to cap the number of people receiving this service. For example, a makeup package can serve four people at a 100-guest event.',
        'Use Maximum units per booking to cap how many groups, vehicles, teams or setups one client can book. For example, a rental can allow up to two vehicles per booking.',
        'Use Available teams / resources at once to set how many resources this package can provide across overlapping bookings. For example, with three Mehndi teams available, a booking using two leaves one team for the same time.',
      ],
      note: 'Capacity fields are optional. Enter positive whole numbers for any limits you set. Working hours, booking notice and the vendor’s concurrent booking limit also affect availability.',
    },
    {
      id: 'package-timing',
      title: 'Choose booking type and timing',
      summary: 'Set the coverage, appointment length, delivery window or setup time.',
      steps: [
        'Duration Based is for services sold by coverage time. In Base Package Included Time, enter how long the base price covers. Use Fixed Duration Options for preset alternatives and enter the full price for each option. Keep prices at least as high as the shorter options.',
        'For flexible coverage, enable Custom Duration and set the rate per extra hour or day. For example, five hours at $200 plus $15 per extra hour gives a seven-hour price of $230 per group when no fixed price applies to seven hours.',
        'Time Slot Based is for appointments. Enter Time needed per booking and select Before Event, During Event or Both. For a before-event appointment, set the earliest start and finish deadline. Choose Both to offer both windows. Enter a separate during-event duration only if it differs.',
        'Delivery Based is for orders you drop off. Set the allowed delivery window relative to the event start and review the delivery fee settings.',
        'Setup Based is for work that must be ready by a certain time. Enter the time needed to set up, the earliest start and the latest finish. Keep the setup window at or before the event start and make sure the setup fits inside it.',
      ],
    },
    {
      id: 'package-review',
      title: 'Preview and save',
      summary: 'Check what the client will see before saving the package.',
      steps: [
        'In Package Images, add photos that show the service or items included. The image limit for your plan is displayed here.',
        'In Live Preview, check the package name, price, pricing method, inclusions and booking details.',
        'Tap Save Package. If the button is unavailable, check the required fields and any messages next to them.',
        'Open the saved package from My Packages to check the details or update them later.',
      ],
    },
  ],
  footer: 'Example prices are in USD and exclude any applicable delivery fees or discounts.',
};
