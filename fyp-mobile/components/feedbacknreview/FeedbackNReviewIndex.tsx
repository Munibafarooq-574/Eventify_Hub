import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    Image,
} from 'react-native';
import { useRouter } from 'expo-router';

const FeedbackNReviewpIndex: React.FC = () => {
    const router = useRouter();

    // State for rating stars
    const [rating, setRating] = useState(0);

    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push("/account")}>
            <Text style={styles.backButton}>{"<"} Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Feedback & Review</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          {/* Score Section */}
          <View style={styles.section}>
            <Text style={styles.label}>Score:</Text>
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                  accessibilityRole="button" // ✅ Safe change for testing
                >
                  <Image
                    source={{
                      uri:
                        star <= rating
                          ? "https://cdn-icons-png.flaticon.com/512/1828/1828884.png" // Filled star
                          : "https://cdn-icons-png.flaticon.com/512/1828/1828970.png", // Empty star
                    }}
                    style={styles.starIcon}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
          {/* Review Section */}
          <View style={styles.section}>
            <Text style={styles.label}>Review:</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Start writing here"
              multiline={true}
            />
          </View>
          {/* Upload Section */}
          <View style={styles.section}>
            <Text style={styles.label}>Share pictures or videos:</Text>
            {/* ✅ Added testID to make the upload button detectable in tests */}
            <TouchableOpacity
              style={styles.uploadContainer}
              testID="upload-button"
            >
              <Image
                source={{
                  uri: "https://cdn-icons-png.flaticon.com/512/1160/1160040.png", // Camera icon
                }}
                style={styles.uploadIcon}
              />
            </TouchableOpacity>
          </View>
          {/* Submit Button */}
          <TouchableOpacity style={styles.submitButton}>
            <Text style={styles.submitButtonText}>Submit</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Navigation */}
        <View style={styles.bottomNavigation}>
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => router.push("/dashboard")}
          >
            <View style={styles.iconContainer}>
              <Image
                source={{
                  uri: "https://cdn.builder.io/api/v1/image/assets/TEMP/037c15c0-3bc9-4416-8c18-69934587461a?placeholderIfAbsent=true&apiKey=0a92af3bc6e24da3a9ef8b1ae693931a",
                }}
                style={styles.iconImage}
              />
            </View>
            <Text style={styles.navText}>Dashboard</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => router.push("/dashboard")}
          >
            <View style={styles.iconContainer}>
              <Image
                source={{
                  uri: "https://cdn.builder.io/api/v1/image/assets/TEMP/549e73c4-da91-40a5-a5c8-fd173b0e2a62?placeholderIfAbsent=true&apiKey=0a92af3bc6e24da3a9ef8b1ae693931a",
                }}
                style={styles.iconImage}
              />
            </View>
            <Text style={styles.navText}>Messages</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => router.push("/dashboard")}
          >
            <View style={styles.iconContainer}>
              <Image
                source={{
                  uri: "https://cdn.builder.io/api/v1/image/assets/TEMP/198f4cc8-49ff-4ccc-b97b-619e572143d4?placeholderIfAbsent=true&apiKey=0a92af3bc6e24da3a9ef8b1ae693931a",
                }}
                style={styles.iconImage}
              />
            </View>
            <Text style={styles.navText}>Notifications</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => router.push("/account")}
          >
            <View style={styles.iconContainer}>
              <Image
                source={{
                  uri: "https://cdn.builder.io/api/v1/image/assets/TEMP/73089a6f-a9a6-4c94-9fd1-4cdd5923a137?placeholderIfAbsent=true&apiKey=0a92af3bc6e24da3a9ef8b1ae693931a",
                }}
                style={styles.iconImage}
              />
            </View>
            <Text style={styles.navText}>Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8E9F0',
        paddingTop: 50,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff',
    },
    backButton: {
        fontSize: 16,
        color: '#780C60',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    section: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    starsContainer: {
        flexDirection: 'row',
    },
    starIcon: {
        width: 30,
        height: 30,
        marginHorizontal: 5,
    },
    textArea: {
        height: 100,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 10,
        padding: 10,
        backgroundColor: '#fff',
        textAlignVertical: 'top',
    },
    uploadContainer: {
        width: '100%',
        height: 150,
        backgroundColor: '#F2D5E3',
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    uploadIcon: {
        width: 50,
        height: 50,
    },
    submitButton: {
        backgroundColor: '#780C60',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    bottomNavigation: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        height: 80,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
        position: 'absolute',
        bottom: 0,
        width: '100%',
        paddingHorizontal: 10, // Ensure spacing around items
    },
    navItem: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconContainer: {
        backgroundColor: '#780C60',
        width: 30,
        height: 30,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 5, // Space between icon and text
    },
    iconImage: {
        // width: 24,
        // height: 24,
        // tintColor: '#fff',
        width: 37,
        height: 37,
        marginBottom: 5,
    },
    navText: {
        fontSize: 10,
        color: '#000000',
        // fontWeight: '500',
        // textAlign: 'center', // Center-align text
    },
});

export default FeedbackNReviewpIndex;
