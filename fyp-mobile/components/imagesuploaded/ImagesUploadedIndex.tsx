// ImageUploadScreen.tsx
import {
  uploadMultipleImages,
  UploadMediaAsset,
} from "@/services/uploadMultipleImages";
import { getSecureData } from "@/store";
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Alert,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";

const ImageUploadScreen: React.FC = () => {
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [images, setImages] = useState<UploadMediaAsset[]>([]);
    const [uploading, setUploading] = useState<boolean>(false);
    const navigation = useNavigation();

    useEffect(() => {
        (async () => {
            // Request media library permissions
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
            }
        })();
    }, []);

    const handleFileUpload = async () => {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.All,
    allowsMultipleSelection: true,
    quality: 0.7,
});

    if (result.canceled) {
      return;
    }

    const remainingSlots = 30 - images.length;

    if (result.assets.length > remainingSlots) {
      Alert.alert(
        'Limit Exceeded',
        `You can upload up to 30 images/videos. Only ${remainingSlots} more can be selected.`
      );
      return;
    }

    const selectedMedia: UploadMediaAsset[] = result.assets.map((asset) => ({
      uri: asset.uri,
      name:
        asset.fileName ||
        `media-${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 8)}.${
          asset.type === 'video' ? 'mp4' : 'jpg'
        }`,
      type:
        asset.mimeType ||
        (asset.type === 'video' ? 'video/mp4' : 'image/jpeg'),
    }));

    setImages((prevImages) => [
      ...prevImages,
      ...selectedMedia,
    ]);
  } catch (error) {
    console.error("Error picking media:", error);

    Alert.alert(
      'Error',
      'An error occurred while selecting photos/videos.'
    );
  }
};

    const handleDeleteImage = (index: number) => {
        setImages(prevImages => {
            const updated = [...prevImages];
            updated.splice(index, 1);
            return updated;
        });
    };

    const handleSaveAndContinue = async () => {
        try {
            setUploading(true);
            const user = JSON.parse(await getSecureData("user") || "");
            await uploadMultipleImages(user._id, images);
    
            router.push("/vendorreview");
        } catch (error: any) {
            console.error("Failed to upload images:", error?.response?.status, error?.response?.data || error?.message || error);
            Alert.alert(
                'Upload Error',
                error?.response?.data?.message
                    ? String(error.response.data.message)
                    : 'Failed to upload images. Please check your internet connection and try again.'
            );
        } finally {
            setUploading(false);
        }
    };

    return (
    <View style={styles.container}>

        {/* Header */}
<View style={styles.headerContainer}>

    <Text style={styles.header}>
        Upload Images
    </Text>


    <Text style={styles.subHeader}>
        Showcase your services with beautiful photos
        {"\n"}
        and attract more customers.
    </Text>


    <View style={styles.limitBadge}>
    <Text style={styles.coverText}>
         Upload up to 30 photos or videos
    </Text>
</View>


</View>

        {/* Upload Box */}
        <TouchableOpacity
            style={styles.uploadCard}
            onPress={handleFileUpload}
            activeOpacity={0.8}
        >

            <View style={styles.iconCircle}>
                <Text style={styles.icon}>📷</Text>
            </View>


            <Text style={styles.uploadTitle}>
                Add your service images
            </Text>

            <Text style={styles.uploadText}>
                Upload up to 30 images
                {"\n"}
                High quality photos attract more customers
            </Text>


            <TouchableOpacity
                style={styles.chooseFileButton}
                onPress={handleFileUpload}
            >
                <Text style={styles.chooseFileButtonText}>
                    Choose Photos
                </Text>
            </TouchableOpacity>

        </TouchableOpacity>



        {/* Images Preview */}
        {images.length > 0 && (
            <View style={styles.photosWrapper}>

                <Text style={styles.sectionTitle}>
                    Selected Photos ({images.length}/30)
                </Text>


                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                >

                    {images.map((media, index) => (
  <View
    key={`${media.uri}-${index}`}
    style={styles.imageContainer}
  >
    <TouchableOpacity
      onPress={() => {
        if (media.type.startsWith('image/')) {
          setSelectedImage(media.uri);
        }
      }}
    >
      {media.type.startsWith('video/') ? (
        <View style={styles.videoPreview}>
          <Text style={styles.videoIcon}>▶</Text>
          <Text style={styles.videoText}>VIDEO</Text>
        </View>
      ) : (
        <Image
          source={{ uri: media.uri }}
          style={styles.photo}
        />
      )}
    </TouchableOpacity>

    <TouchableOpacity
      style={styles.deleteButton}
      onPress={() => handleDeleteImage(index)}
    >
      <Text style={styles.deleteButtonText}>
        ×
      </Text>
    </TouchableOpacity>

    {index === 0 && (
      <View style={styles.coverBadge}>
        <Text style={styles.coverBadgeText}>
          Cover
        </Text>
      </View>
    )}
  </View>
))}

                </ScrollView>

            </View>
        )}



        {/* Footer */}
        <View style={styles.footer}>

            <TouchableOpacity
                onPress={()=>navigation.goBack()}
                style={styles.buttonBack}
            >
                <Text style={styles.backText}>
                    Back
                </Text>
            </TouchableOpacity>



            <TouchableOpacity
                style={[
                    styles.saveButton,
                    (uploading || images.length===0)
                    && styles.disabledButton
                ]}
                disabled={uploading || images.length===0}
                onPress={handleSaveAndContinue}
            >

                <Text style={styles.saveButtonText}>
                    {uploading 
                    ? "Uploading..."
                    :"Save & Continue"}
                </Text>

            </TouchableOpacity>

        </View>




        {/* Image Modal */}
        <Modal
            visible={!!selectedImage}
            transparent
            onRequestClose={()=>setSelectedImage(null)}
        >

            <View style={styles.modalBackground}>

                <View style={styles.modalContent}>

                    {selectedImage && (
                        <Image
                            source={{uri:selectedImage}}
                            style={styles.enlargedImage}
                            resizeMode="contain"
                        />
                    )}


                    <TouchableOpacity
                        onPress={()=>setSelectedImage(null)}
                        style={styles.closeButton}
                    >
                        <Text style={styles.closeButtonText}>
                            Close
                        </Text>
                    </TouchableOpacity>


                </View>

            </View>

        </Modal>


    </View>
);
};

const styles = StyleSheet.create({
container:{
    flex:1,
    backgroundColor:"#FDF5FA",
    paddingHorizontal:20,
    paddingTop:65,
},
headerContainer:{
    alignItems:"center",
    marginBottom:25,
},
header:{
    fontSize:30,
    fontWeight:"800",
    color:"#780C60",
    marginBottom:10,
    textAlign:"center",
},
subHeader:{
    fontSize:15,
    color:"#666",
    lineHeight:22,
    textAlign:"center",
    paddingHorizontal:10,
},
limitBadge:{
    marginTop:15,
    backgroundColor:"#F9E7F3",
    paddingHorizontal:18,
    paddingVertical:8,
    borderRadius:20,
},
coverText:{
    fontSize:14,
    color:"#780C60",
    fontWeight:"600",
},
uploadCard:{
    backgroundColor:"#fff",
    borderRadius:22,
    paddingVertical:30,
    alignItems:"center",
    borderWidth:1.5,
    borderColor:"#D9A5CF",
    borderStyle:"dashed",
    elevation:4,
},
iconCircle:{
    height:75,
    width:75,
    borderRadius:40,
    backgroundColor:"#F8E1F1",
    justifyContent:"center",
    alignItems:"center",
    marginBottom:15,
},
icon:{
    fontSize:38,
},
uploadTitle:{
    fontSize:18,
    fontWeight:"700",
    color:"#2B1025",
},
uploadText:{
    marginTop:8,
    textAlign:"center",
    color:"#777",
    lineHeight:22,
},
chooseFileButton:{
    marginTop:20,
    backgroundColor:"#780C60",
    paddingHorizontal:35,
    paddingVertical:13,
    borderRadius:30,
},
chooseFileButtonText:{
    color:"#fff",
    fontWeight:"700",
},
photosWrapper:{
    marginTop:25,
},
videoPreview: {
  width: 105,
  height: 105,
  borderRadius: 18,
  backgroundColor: "#2B1025",
  justifyContent: "center",
  alignItems: "center",
},

videoIcon: {
  color: "#fff",
  fontSize: 30,
  marginBottom: 5,
},
videoText: {
  color: "#fff",
  fontSize: 11,
  fontWeight: "700",
},
sectionTitle:{
    fontSize:16,
    fontWeight:"700",
    marginBottom:12,
    color:"#2B1025",
},



imageContainer:{
    marginRight:12,
    position:"relative",
},


photo:{
    width:105,
    height:105,
    borderRadius:18,
},



deleteButton:{
    position:"absolute",
    right:5,
    top:5,
    height:28,
    width:28,
    borderRadius:15,
    backgroundColor:"#780C60",
    justifyContent:"center",
    alignItems:"center",
},


deleteButtonText:{
    color:"#fff",
    fontSize:18,
    fontWeight:"bold",
},



coverBadge:{
    position:"absolute",
    bottom:5,
    left:5,
    backgroundColor:"#780C60",
    paddingHorizontal:10,
    paddingVertical:4,
    borderRadius:10,
},


coverBadgeText:{
    color:"#fff",
    fontSize:11,
    fontWeight:"700",
},




footer:{
    flexDirection:"row",
    position:"absolute",
    bottom:30,
    left:20,
    right:20,
},



buttonBack:{
    flex:1,
    height:55,
    borderRadius:15,
    borderWidth:1,
    borderColor:"#780C60",
    justifyContent:"center",
    alignItems:"center",
    marginRight:10,
    backgroundColor:"#fff",
},


backText:{
    color:"#780C60",
    fontWeight:"700",
    fontSize:16,
},



saveButton:{
    flex:1,
    height:55,
    borderRadius:15,
    backgroundColor:"#780C60",
    justifyContent:"center",
    alignItems:"center",
    marginLeft:10,
},


disabledButton:{
    opacity:0.5,
},


saveButtonText:{
    color:"#fff",
    fontWeight:"700",
    fontSize:16,
},




modalBackground:{
    flex:1,
    backgroundColor:"rgba(0,0,0,0.75)",
    justifyContent:"center",
    alignItems:"center",
},


modalContent:{
    width:"90%",
    backgroundColor:"#fff",
    borderRadius:20,
    padding:15,
},


enlargedImage:{
    width:"100%",
    height:350,
},


closeButton:{
    backgroundColor:"#780C60",
    padding:12,
    borderRadius:15,
    alignItems:"center",
},


closeButtonText:{
    color:"#fff",
    fontWeight:"700",
},


});

export default ImageUploadScreen;
