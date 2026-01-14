import { TutorialDef } from '../models/tutorial.model';

export const TUTORIALS: Record<string, TutorialDef> = {
    INTRO_SHIFT: {
        id: 'intro_shift',
        title: 'Welcome to Epicenter',
        steps: [
            {
                title: 'Welcome Aboard!',
                content: 'Welcome to the Epicenter System. This quick guide will help you manage the gym like a pro. Let\'s start with the basics of your daily workflow.',
                icon: 'waving_hand'
            },
            {
                title: 'Open Your Register',
                content: 'Start your shift by clicking "Open Register". Always count the cash in the drawer physically and enter the exact Opening Balance. Accuracy here is key for your end-of-day report.',
                icon: 'point_of_sale'
            }
        ]
    },
    CHECKIN: {
        id: 'checkin',
        title: 'Member Check-in',
        steps: [
            {
                title: 'Check-in Everyone',
                content: 'Every person entering the gym must be checked in here. If a member isn\'t in the system yet, please add them immediately using the "New Member" button.',
                icon: 'how_to_reg'
            },
            {
                title: 'Payment Options',
                content: 'You can check in "Walk-ins" (one-time payment) or "Members" (subscription). You can also mark visits as Paid or Unpaid if needed. Always issue a receipt!',
                icon: 'payments'
            },
            {
                title: 'Checkout & Keys',
                content: 'CRITICAL: Don\'t forget to "Check Out" members when they leave. This is also your reminder to collect their Locker Keys before they go!',
                icon: 'key'
            }
        ]
    },
    POS: {
        id: 'pos',
        title: 'Point of Sale',
        steps: [
            {
                title: 'Selling Items',
                content: 'Use this page to sell supplements, drinks, and merch. IMPORTANT: Always select the Member purchasing the item so we can track their points and history.',
                icon: 'shopping_cart'
            },
            {
                title: 'Edit Prices',
                content: 'Need to apply a custom discount or fix a price? You can edit the price of any item directly in the cart. Just tap the item.',
                icon: 'edit'
            },
            {
                title: 'Payments',
                content: 'We accept Cash and GCash. For cash payments, simply enter the amount tendered, and the system will calculate the exact change for you.',
                icon: 'calculate'
            }
        ]
    },
    SHIFT_MGMT: {
        id: 'shift_mgmt',
        title: 'Shift Management',
        steps: [
            {
                title: 'Cash Management',
                content: 'Need to take cash out for supplies? Or add extra loose change? Use "Float In/Out" on this page. Always add a reason for every movement.',
                icon: 'swap_horiz'
            },
            {
                title: 'Close Your Own Shift',
                content: 'Security Rule #1: Always close your OWN shift. Never share your open register with another staff member. All transactions are logged under your name.',
                icon: 'security'
            }
        ]
    },
    MEMBERS_LIST: {
        id: 'members_list',
        title: 'Managing Members',
        steps: [
            {
                title: 'Member Overview',
                content: 'This is your master list of all gym members. You can see their active status, subscription expiration, and contact details at a glance.',
                icon: 'groups'
            },
            {
                title: 'Add New Member',
                content: 'New sign-up? Click the "Add Member" button to register them. Make sure to capture their photo and contact info for our records.',
                icon: 'person_add'
            },
            {
                title: 'Find & Filter',
                content: 'Use the search bar to find members by name or phone number. You can also filter by "Active/Inactive" status or Subscription type to organize the list.',
                icon: 'search'
            },
            {
                title: 'Quick Actions',
                content: 'Need to update a status? Click the status chip to toggle between Active and Inactive. For full details or to update their subscription, click the "View" button.',
                icon: 'touch_app'
            }
        ]
    },
    MEMBER_PROGRESS: {
        id: 'member_progress',
        title: 'Member Progress',
        steps: [
            {
                title: 'Track the Journey',
                content: 'This dashboard visualizes the member\'s fitness journey. Use it to show them their improvements over time and keep them motivated!',
                icon: 'legend_toggle'
            },
            {
                title: 'Attendance Stats',
                content: 'Consistency is key! The calendar heatmap shows how often they visit. Green means good attendance. Use this to encourage regulars.',
                icon: 'calendar_month'
            },
            {
                title: 'Body Measurements',
                content: 'Record and track detailed body metrics here—Weight, Body Fat %, Muscle Mass, and more. The system automatically calculates the difference from their last check-up.',
                icon: 'monitor_weight'
            }
        ]
    }
};
