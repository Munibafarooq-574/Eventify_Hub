//  {/* Bottom Navigation */}
//  <View style={styles.bottomNavigation}>
//  <TouchableOpacity style={styles.navItem} onPress={() => router.push('/dashboard')}>
//    <View style={styles.iconContainer}>
//      <Image
//        source={{
//          uri: 'https://cdn.builder.io/api/v1/image/assets/TEMP/037c15c0-3bc9-4416-8c18-69934587461a?placeholderIfAbsent=true&apiKey=0a92af3bc6e24da3a9ef8b1ae693931a',
//        }}
//        style={styles.iconImage}
//      />
//    </View>
//    <Text style={styles.navText}>Dashboard</Text>
//  </TouchableOpacity>

//  <TouchableOpacity style={styles.navItem} onPress={() => router.push('/dashboard')}>
//    <View style={styles.iconContainer}>
//      <Image
//        source={{ uri: 'https://cdn.builder.io/api/v1/image/assets/TEMP/549e73c4-da91-40a5-a5c8-fd173b0e2a62?placeholderIfAbsent=true&apiKey=0a92af3bc6e24da3a9ef8b1ae693931a' }}
//        style={styles.iconImage}
//      />
//    </View>
//    <Text style={styles.navText}>Messages</Text>
//  </TouchableOpacity>

//  <TouchableOpacity style={styles.navItem} onPress={() => router.push('/dashboard')}>
//    <View style={styles.iconContainer}>
//      <Image
//        source={{ uri: 'https://cdn.builder.io/api/v1/image/assets/TEMP/198f4cc8-49ff-4ccc-b97b-619e572143d4?placeholderIfAbsent=true&apiKey=0a92af3bc6e24da3a9ef8b1ae693931a' }}
//        style={styles.iconImage}
//      />
//    </View>
//    <Text style={styles.navText}>Notifications</Text>
//  </TouchableOpacity>

//  <TouchableOpacity style={styles.navItem} onPress={() => router.push('/account')}>
//    <View style={styles.iconContainer}>
//      <Image
//        source={{
//          uri: 'https://cdn.builder.io/api/v1/image/assets/TEMP/73089a6f-a9a6-4c94-9fd1-4cdd5923a137?placeholderIfAbsent=true&apiKey=0a92af3bc6e24da3a9ef8b1ae693931a',
//        }}
//        style={styles.iconImage}
//      />
//    </View>
//    <Text style={styles.navText}>Account</Text>
//  </TouchableOpacity>
// </View>


// bottomNavigation: {
//     flexDirection: 'row',
//     justifyContent: 'space-around',
//     alignItems: 'center',
//     height: 80,
//     backgroundColor: '#fff',
//     borderTopWidth: 1,
//     borderTopColor: '#E0E0E0',
//     position: 'absolute',
//     bottom: 0,
//     width: '100%',
//     paddingHorizontal: 10, // Ensure spacing around items
//   },
//   navItem: {
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   iconContainer: {
//     backgroundColor: '#780C60',
//     width: 30,
//     height: 30,
//     borderRadius: 25,
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginBottom: 5, // Space between icon and text
//   },
//   iconImage: {
//     // width: 24,
//     // height: 24,
//     // tintColor: '#fff',
//     width: 37,
//     height: 37,
//     marginBottom: 5,
//   },
//   navText: {
//     fontSize: 10,
//     color: '#000000',
//     // fontWeight: '500',
//     // textAlign: 'center', // Center-align text
//   },





import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
} from 'react-native';
//import { Calendar } from 'react-native-calendars';

const PhotographerDetailsScreen: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'Details' | 'Packages' | 'Reviews'>('Details');
    const [activePackage, setActivePackage] = useState<number>(1);

    // Package Data
    const packages = [
        {
            id: 1,
            name: 'Package 1',
            duration: '1-Day Team',
            price: 'PKR 100,000',
            deliverables: [
                '1 Day Event Coverage | 1 Day Team Shoot',
                '1 Event Album (100 photos per album)',
                '1 Shoot Album (50 photos per album)',
                '1 Long Video (5–10 mins)',
                '1 Highlight of Shoot (30–50 sec)',
                'All Raw Photos provided after event',
            ],
            photography: '1 Event Album (100 photos per album)',
            team: '2 Photographers',
            videography: '1 Long Video (5–10 mins)\n1 Highlight of event (3–5 mins)',
        },
        {
            id: 2,
            name: 'Package 2',
            duration: '2-Day Team',
            price: 'PKR 175,000',
            deliverables: [
                '2 Day Event Coverage | 2 Day Team Shoot',
                '2 Event Albums (100 photos per album)',
                '2 Shoot Albums (50 photos per album)',
                '2 Long Videos (8–12 mins each)',
                '2 Highlight of Shoot (30–50 sec)',
                'Storyboard (Photo) Complementary',
            ],
            photography: '2 Shoot Albums (50 photos per album)',
            team: '2 Photographers | 1 Videographer',
            videography: '2 Long Videos (8–12 mins each)\n2 Highlight of event (30–50 sec)',
        },
        {
            id: 3,
            name: 'Package 3',
            duration: 'Basic',
            price: 'PKR 175,000',
            deliverables: [
                'Basic Package Deliverables Example',
                'Adjust as needed.',
            ],
            photography: 'Example Photography Description',
            team: 'Basic Example Team Description',
            videography: 'Basic Example Videography Description',
        },
        {
            id: 4,
            name: 'Package 4',
            duration: '3-Day Team',
            price: 'PKR 250,000',
            deliverables: [
                '3 Day Event Coverage | 3 Day Team Shoot',
                '3 Event Albums (100 photos per album)',
                '3 Shoot Albums (50 photos per album)',
                '3 Long Videos (8–12 mins each)',
                '3 Highlight of Shoot (30–50 sec)',
                'Storyboard (Photo) Complementary',
            ],
            photography: '3 Shoot Albums (50 photos per album)',
            team: '2 Photographers | 2 Videographers',
            videography: '3 Long Videos (8–12 mins each)\n3 Highlight of event (30–50 sec)',
        },
    ];

    return (
        <ScrollView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.backText}>Back</Text>
                <Text style={styles.title}>Photographers</Text>
            </View>

            {/* Tab Navigation */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'Details' && styles.activeTab]}
                    onPress={() => setActiveTab('Details')}
                >
                    <Text style={[styles.tabText, activeTab === 'Details' && styles.activeTabText]}>
                        Details
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'Packages' && styles.activeTab]}
                    onPress={() => setActiveTab('Packages')}
                >
                    <Text style={[styles.tabText, activeTab === 'Packages' && styles.activeTabText]}>
                        Packages
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'Reviews' && styles.activeTab]}
                    onPress={() => setActiveTab('Reviews')}
                >
                    <Text style={[styles.tabText, activeTab === 'Reviews' && styles.activeTabText]}>
                        Reviews
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Tab Content */}
            {activeTab === 'Details' && (
                <View style={styles.detailsContainer}>
                    <Text style={styles.name}>Arfa Hussain</Text>
                    <Text style={styles.description}>
                        For signature shoots and packages Arfa Usman can be contacted. There will be charges
                        on top for events and shoots out of Lahore.
                    </Text>
                </View>
            )}

            {activeTab === 'Packages' && (
                <>
                    {/* Package Tabs */}
                    <View style={styles.packageTabContainer}>
                        {packages.map((pkg) => (
                            <TouchableOpacity
                                key={pkg.id}
                                style={[styles.packageTab, activePackage === pkg.id && styles.activePackageTab]}
                                onPress={() => setActivePackage(pkg.id)}
                            >
                                <Text
                                    style={[
                                        styles.packageTabText,
                                        activePackage === pkg.id && styles.activePackageTabText,
                                    ]}
                                >
                                    {pkg.name} ({pkg.duration})
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Package Details */}
                    {packages
                        .filter((pkg) => pkg.id === activePackage)
                        .map((pkg) => (
                            <View key={pkg.id} style={styles.packageDetails}>
                                <Text style={styles.sectionTitle}>Deliverables</Text>
                                {pkg.deliverables.map((item, index) => (
                                    <Text key={index} style={styles.packageDetailItem}>
                                        {item}
                                    </Text>
                                ))}

                                <Text style={styles.sectionTitle}>Photography</Text>
                                <Text style={styles.packageDetailItem}>{pkg.photography}</Text>

                                <Text style={styles.sectionTitle}>Team</Text>
                                <Text style={styles.packageDetailItem}>{pkg.team}</Text>

                                <Text style={styles.sectionTitle}>Videography</Text>
                                <Text style={styles.packageDetailItem}>{pkg.videography}</Text>

                                <Text style={styles.priceText}>{pkg.price}</Text>
                            </View>
                        ))}

                    {/* Check Availability Button */}
                    <TouchableOpacity style={styles.checkAvailabilityButton}>
                        <Text style={styles.checkAvailabilityButtonText}>Check Availability</Text>
                    </TouchableOpacity>
                </>
            )}

            {activeTab === 'Reviews' && (
                <View style={styles.tabContent}>
                    <Text style={styles.sectionTitle}>Reviews</Text>
                    <Text style={styles.reviewItem}>★★★★★ - Amazing service, highly recommended!</Text>
                    <Text style={styles.reviewItem}>★★★★☆ - Great photos, but delivery was a bit late.</Text>
                </View>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8EAF2',
        paddingHorizontal: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    backText: {
        fontSize: 16,
        color: '#000',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        flex: 1,
    },
    tabContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: 16,
    },
    tab: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
    },
    activeTab: {
        borderBottomWidth: 2,
        borderBottomColor: '#7B2869',
    },
    tabText: {
        fontSize: 14,
        color: '#7A7A7A',
    },
    activeTabText: {
        color: '#7B2869',
        fontWeight: 'bold',

    },
    name: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        flex: 1,
    },

    description: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        flex: 1,
    },

    detailsContainer: {
        padding: 16,
    },
    packageTabContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: 16,
    },
    packageTab: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
    },
    activePackageTab: {
        borderBottomWidth: 2,
        borderBottomColor: '#7B2869',
    },
    packageTabText: {
        fontSize: 14,
        color: '#7A7A7A',
    },
    activePackageTabText: {
        color: '#7B2869',
        fontWeight: 'bold',
    },
    packageDetails: {
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginVertical: 8,
    },
    packageDetailItem: {
        fontSize: 14,
        marginVertical: 2,
        color: '#7A7A7A',
    },
    priceText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#7B2869',
        textAlign: 'right',
        marginVertical: 8,
    },
    checkAvailabilityButton: {
        backgroundColor: '#7B2869',
        padding: 16,
        marginVertical: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    checkAvailabilityButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    tabContent: {
        padding: 16,
    },
    reviewItem: {
        fontSize: 14,
        marginVertical: 4,
    },
});

export default PhotographerDetailsScreen;
