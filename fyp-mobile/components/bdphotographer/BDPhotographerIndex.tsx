import postPhotographyBusinessDetails from "@/services/postPhotographyBusinessDetails";
import patchBusinessDetails from "@/services/patchBusinessDetails";
import { getSecureData } from "@/store";
import { FontAwesome5 } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const PHOTOGRAPHY_TYPES = [
  { label: "WEDDING", icon: "camera" },
  { label: "PRE-WEDDING", icon: "heart" },
  { label: "ENGAGEMENT", icon: "ring" },
  { label: "BIRTHDAY", icon: "birthday-cake" },
  { label: "CORPORATE", icon: "briefcase" },
  { label: "CINEMATIC", icon: "video" },
];

const EQUIPMENT = [
  { label: "DSLR", icon: "camera-retro" },
  { label: "DRONE", icon: "helicopter" },
  { label: "4K VIDEO", icon: "film" },
  { label: "LIGHTING", icon: "lightbulb" },
  { label: "GIMBAL", icon: "video" },
];

const EDITING_SERVICES = [
  { label: "PHOTO EDITING", icon: "image" },
  { label: "VIDEO EDITING", icon: "video" },
  { label: "ALBUM DESIGN", icon: "book" },
  { label: "REELS", icon: "play-circle" },
];

const STAFF_GENDERS = [
  { label: "MALE", icon: "male" },
  { label: "FEMALE", icon: "female" },
  { label: "TRANSGENDER", icon: "transgender-alt" },
];

const PHOTO_STYLES = [
  { label: "TRADITIONAL", icon: "camera" },
  { label: "CANDID", icon: "smile" },
  { label: "CINEMATIC", icon: "film" },
  { label: "DOCUMENTARY", icon: "video" },
];

const DELIVERY_TIME = [
  "2 DAYS",
  "5 DAYS",
  "1 WEEK",
  "2 WEEKS",
];

const SectionTitle = ({
  icon,
  title,
  required,
}: {
  icon: string;
  title: string;
  required?: boolean;
}) => (
  <View style={styles.sectionTitleRow}>
    <View style={styles.sectionIconWrap}>
      <FontAwesome5 name={icon} size={16} color="#780C60" />
    </View>
    <Text style={styles.label}>
      {title}{required ? <Text style={styles.requiredStar}> *</Text> : null}
    </Text>
  </View>
);

const BusinessDetailsScreen = () => {
  const { edit, userId } = useLocalSearchParams();
  // ==========================
  // Multi Select States
  // ==========================

  const [photographyTypes, setPhotographyTypes] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [editingServices, setEditingServices] = useState<string[]>([]);
  const [staffGender, setStaffGender] = useState<string[]>([]);
  const [photoStyle, setPhotoStyle] = useState<string[]>([]);

  // ==========================
  // Single Select States
  // ==========================

  const [travelsToClientHome, setTravelsToClientHome] =
    useState<"YES" | "NO" | null>(null);

  const [deliveryTime, setDeliveryTime] = useState<string>("");

  const [downPaymentType, setDownPaymentType] =
    useState<"PERCENTAGE" | "FIXED" | null>(null);

  const [covidCompliant, setCovidCompliant] =
    useState<"YES" | "NO" | null>(null);

  const [refundPolicy, setRefundPolicy] =
    useState<
      "REFUNDABLE" |
      "NON-REFUNDABLE" |
      "PARTIALLY REFUNDABLE" |
      null
    >(null);

  // ==========================
  // Text Fields
  // ==========================

  const [cityCovered, setCityCovered] = useState("");

  const [minimumPrice, setMinimumPrice] = useState("");

  const [description, setDescription] = useState("");

  const [additionalInfo, setAdditionalInfo] = useState("");

  const [downPayment, setDownPayment] = useState("");

  useEffect(() => {
  if (edit !== "true") return;

  const loadData = async () => {
    try {
      const res = await axios.get(
        `https://eventify-hub.onrender.com/vendor?userId=${userId}`
      );

      const data = res.data.photographerBusinessDetails;

      setPhotographyTypes(data.photographyTypes || []);
      setEquipment(data.equipment || []);
      setEditingServices(data.editingServices || []);
      setStaffGender(data.staffGender || []);
      setPhotoStyle(data.photoStyle || []);
      setTravelsToClientHome(
        data.travelsToClientHome ? "YES" : "NO"
      );
      setDeliveryTime(data.deliveryTime || "");
      setCityCovered(data.cityCovered || "");
      setMinimumPrice(data.minimumPrice?.toString() || "");
      setDescription(data.description || "");
      setAdditionalInfo(data.additionalInfo || "");
      setDownPaymentType(data.downPaymentType || null);
      setDownPayment(data.downPayment?.toString() || "");
      setCovidCompliant(data.covidCompliant || null);
      setRefundPolicy(data.covidRefundPolicy || null);
    } catch (err) {
      console.log(err);
    }
  };

  loadData();
}, [edit, userId]);
  // ==========================
  // Toggle Functions
  // ==========================

  const togglePhotographyType = (label: string) => {
    setPhotographyTypes((prev) =>
      prev.includes(label)
        ? prev.filter((item) => item !== label)
        : [...prev, label]
    );
  };

  const toggleEquipment = (label: string) => {
    setEquipment((prev) =>
      prev.includes(label)
        ? prev.filter((item) => item !== label)
        : [...prev, label]
    );
  };

  const toggleEditing = (label: string) => {
    setEditingServices((prev) =>
      prev.includes(label)
        ? prev.filter((item) => item !== label)
        : [...prev, label]
    );
  };

  const toggleStaff = (label: string) => {
    setStaffGender((prev) =>
      prev.includes(label)
        ? prev.filter((item) => item !== label)
        : [...prev, label]
    );
  };

  const togglePhotoStyle = (label: string) => {
    setPhotoStyle((prev) =>
      prev.includes(label)
        ? prev.filter((item) => item !== label)
        : [...prev, label]
    );
  };

  // ==========================
  // Submit
  // ==========================

  const submit = async () => {

    if (
      photographyTypes.length === 0 ||
      equipment.length === 0 ||
      editingServices.length === 0 ||
      staffGender.length === 0 ||
      photoStyle.length === 0 ||
      travelsToClientHome === null ||
      !deliveryTime ||
      !cityCovered ||
      !minimumPrice ||
      !description ||
      !downPaymentType ||
      !downPayment ||
      !covidCompliant ||
      !refundPolicy
    ) {

      Alert.alert(
        "Missing Information",
        "Please fill all required fields."
      );

      return;
    }

    try {

      const user = JSON.parse(await getSecureData("user") || "");

      const dto = {
  photographyTypes,
  equipment,
  editingServices,
  staffGender,
  photoStyle,
  travelsToClientHome: travelsToClientHome === "YES",
  deliveryTime,
  cityCovered,
  minimumPrice: Number(minimumPrice),
  description,
  additionalInfo,
  downPaymentType,
  downPayment: Number(downPayment),
  covidCompliant,
  covidRefundPolicy: refundPolicy,
};

if (edit === "true") {

  await patchBusinessDetails(user._id, dto);

  Alert.alert(
    "Success",
    "Business Details Updated Successfully."
  );

  router.back();

} else {

  await postPhotographyBusinessDetails(user._id, dto);

  Alert.alert(
    "Success",
    "Business Details Saved Successfully."
  );

  router.push("/packages");
}

    } catch (error) {

      console.log(error);

      Alert.alert(
        "Error",
        "Something went wrong."
      );
    }
  };
  return (
  <ScrollView
    contentContainerStyle={styles.container}
    showsVerticalScrollIndicator={false}
  >

    {/* ================= HEADER ================= */}

    <View style={styles.headerWrap}>

      <View style={styles.headerIconBadge}>
        <FontAwesome5
          name="camera"
          size={22}
          color="#780C60"
        />
      </View>

      <Text style={styles.header}>
        Photography Business
      </Text>

      <Text style={styles.subHeader}>
        Showcase your photography and videography services.
        Help customers discover your style and book your team.
      </Text>

      <View style={styles.dotsRow}>
        {[0, 1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === 2 && styles.dotAccent,
            ]}
          />
        ))}
      </View>

    </View>

    {/* ================= Photography Types ================= */}

    <View style={styles.card}>

      <SectionTitle
        icon="camera-retro"
        title="Photography Services"
        required
      />

      <Text style={styles.hint}>
        Select all services you provide
      </Text>

      <View style={styles.chipContainer}>

        {PHOTOGRAPHY_TYPES.map((item) => {

          const isSelected =
            photographyTypes.includes(item.label);

          return (

            <TouchableOpacity
              key={item.label}
              activeOpacity={0.85}
              onPress={() =>
                togglePhotographyType(item.label)
              }
              style={[
                styles.chip,
                isSelected && styles.chipSelected,
              ]}
            >

              <FontAwesome5
                name={item.icon}
                size={16}
                style={[
                  styles.chipIcon,
                  isSelected &&
                    styles.chipIconSelected,
                ]}
              />

              <Text
                style={[
                  styles.chipText,
                  isSelected &&
                    styles.chipTextSelected,
                ]}
              >
                {item.label}
              </Text>

              {isSelected && (

                <View style={styles.checkBadge}>
                  <FontAwesome5
                    name="check"
                    size={8}
                    color="#780C60"
                  />
                </View>

              )}

            </TouchableOpacity>

          );

        })}

      </View>

    </View>
    {/* =========================
      Equipment
========================= */}

<View style={styles.card}>

    <SectionTitle
        icon="toolbox"
        title="Equipment Available"
        required
    />

    <Text style={styles.hint}>
        Select all equipment you use
    </Text>

    <View style={styles.chipContainer}>

        {EQUIPMENT.map((item) => {

            const isSelected = equipment.includes(item.label);

            return (

                <TouchableOpacity
                    key={item.label}
                    activeOpacity={0.85}
                    onPress={() => toggleEquipment(item.label)}
                    style={[
                        styles.chip,
                        isSelected && styles.chipSelected,
                    ]}
                >

                    <FontAwesome5
                        name={item.icon}
                        size={16}
                        style={[
                            styles.chipIcon,
                            isSelected && styles.chipIconSelected,
                        ]}
                    />

                    <Text
                        style={[
                            styles.chipText,
                            isSelected && styles.chipTextSelected,
                        ]}
                    >
                        {item.label}
                    </Text>

                    {isSelected && (

                        <View style={styles.checkBadge}>
                            <FontAwesome5
                                name="check"
                                size={8}
                                color="#780C60"
                            />
                        </View>

                    )}

                </TouchableOpacity>

            );

        })}

    </View>

</View>

{/* =========================
      Editing Services
========================= */}

<View style={styles.card}>

    <SectionTitle
        icon="photo-video"
        title="Editing Services"
        required
    />

    <Text style={styles.hint}>
        Select all editing services you provide
    </Text>

    <View style={styles.chipContainer}>

        {EDITING_SERVICES.map((item) => {

            const isSelected =
                editingServices.includes(item.label);

            return (

                <TouchableOpacity
                    key={item.label}
                    activeOpacity={0.85}
                    onPress={() => toggleEditing(item.label)}
                    style={[
                        styles.chip,
                        isSelected && styles.chipSelected,
                    ]}
                >

                    <FontAwesome5
                        name={item.icon}
                        size={16}
                        style={[
                            styles.chipIcon,
                            isSelected &&
                            styles.chipIconSelected,
                        ]}
                    />

                    <Text
                        style={[
                            styles.chipText,
                            isSelected &&
                            styles.chipTextSelected,
                        ]}
                    >
                        {item.label}
                    </Text>

                    {isSelected && (

                        <View style={styles.checkBadge}>

                            <FontAwesome5
                                name="check"
                                size={8}
                                color="#780C60"
                            />

                        </View>

                    )}

                </TouchableOpacity>

            );

        })}

    </View>

</View>
{/* =========================
      Travels to Client Home
========================= */}

<View style={styles.card}>

    <SectionTitle
        icon="route"
        title="Travels to Client Location"
        required
    />

    <Text style={styles.hint}>
        Select whether you provide on-location photography services.
    </Text>

    <View style={styles.pillRow}>

        {["YES", "NO"].map((option) => (

            <TouchableOpacity
                key={option}
                activeOpacity={0.85}
                onPress={() =>
                    setTravelsToClientHome(
                        option as "YES" | "NO"
                    )
                }
                style={[
                    styles.pill,
                    travelsToClientHome === option &&
                        styles.pillSelected,
                ]}
            >

                <FontAwesome5
                    name={
                        option === "YES"
                            ? "check-circle"
                            : "times-circle"
                    }
                    size={14}
                    style={[
                        styles.pillIcon,
                        travelsToClientHome === option &&
                            styles.pillIconSelected,
                    ]}
                />

                <Text
                    style={[
                        styles.pillText,
                        travelsToClientHome === option &&
                            styles.pillTextSelected,
                    ]}
                >
                    {option}
                </Text>

            </TouchableOpacity>

        ))}

    </View>

</View>

{/* =========================
      City Covered
========================= */}

<View style={styles.card}>

    <SectionTitle
        icon="map-marker-alt"
        title="City Covered"
        required
    />

    <Text style={styles.hint}>
        Enter the cities where your photography team is available.
    </Text>

    <View style={styles.inputRow}>

        <FontAwesome5
            name="city"
            size={16}
            color="#780C60"
            style={{ marginRight: 10 }}
        />

        <TextInput
            style={styles.inputFlex}
            placeholder="e.g. Islamabad, Lahore"
            placeholderTextColor="#B99DAF"
            value={cityCovered}
            onChangeText={setCityCovered}
        />

    </View>

</View>
{/* =========================
        Staff
========================= */}

<View style={styles.card}>

    <SectionTitle
        icon="users"
        title="Photography Team"
        required
    />

    <Text style={styles.hint}>
        Select all team members available for bookings
    </Text>

    <View style={styles.chipContainer}>

        {STAFF_GENDERS.map((staff) => {

            const isSelected =
                staffGender.includes(staff.label);

            return (

                <TouchableOpacity
                    key={staff.label}
                    activeOpacity={0.85}
                    onPress={() =>
                        toggleStaff(staff.label)
                    }
                    style={[
                        styles.chip,
                        isSelected &&
                        styles.chipSelected,
                    ]}
                >

                    <FontAwesome5
                        name={staff.icon}
                        size={16}
                        style={[
                            styles.chipIcon,
                            isSelected &&
                            styles.chipIconSelected,
                        ]}
                    />

                    <Text
                        style={[
                            styles.chipText,
                            isSelected &&
                            styles.chipTextSelected,
                        ]}
                    >
                        {staff.label}
                    </Text>

                    {isSelected && (

                        <View style={styles.checkBadge}>

                            <FontAwesome5
                                name="check"
                                size={8}
                                color="#780C60"
                            />

                        </View>

                    )}

                </TouchableOpacity>

            );

        })}

    </View>

    {/* Optional Information Box */}

    <View
        style={{
            marginTop: 14,
            backgroundColor: "#FBEFF7",
            borderRadius: 12,
            padding: 12,
            flexDirection: "row",
            alignItems: "center",
        }}
    >

        <FontAwesome5
            name="info-circle"
            size={14}
            color="#780C60"
        />

        <Text
            style={{
                marginLeft: 8,
                flex: 1,
                color: "#7A5A71",
                fontSize: 12,
                lineHeight: 18,
            }}
        >
            Customers will see your available team while
            booking photography services.
        </Text>

    </View>

</View>
{/* =========================
      Photography Style
========================= */}

<View style={styles.card}>

    <SectionTitle
        icon="camera"
        title="Photography Style"
        required
    />

    <Text style={styles.hint}>
        Select all photography styles you specialize in
    </Text>

    <View style={styles.chipContainer}>

        {PHOTO_STYLES.map((style) => {

            const isSelected =
                photoStyle.includes(style.label);

            return (

                <TouchableOpacity
                    key={style.label}
                    activeOpacity={0.85}
                    onPress={() =>
                        togglePhotoStyle(style.label)
                    }
                    style={[
                        styles.chip,
                        isSelected && styles.chipSelected,
                    ]}
                >

                    <FontAwesome5
                        name={style.icon}
                        size={16}
                        style={[
                            styles.chipIcon,
                            isSelected &&
                            styles.chipIconSelected,
                        ]}
                    />

                    <Text
                        style={[
                            styles.chipText,
                            isSelected &&
                            styles.chipTextSelected,
                        ]}
                    >
                        {style.label}
                    </Text>

                    {isSelected && (

                        <View style={styles.checkBadge}>

                            <FontAwesome5
                                name="check"
                                size={8}
                                color="#780C60"
                            />

                        </View>

                    )}

                </TouchableOpacity>

            );

        })}

    </View>

</View>

{/* =========================
      Delivery Time
========================= */}

<View style={styles.card}>

    <SectionTitle
        icon="clock"
        title="Delivery Time"
        required
    />

    <Text style={styles.hint}>
        Estimated delivery for edited photos/videos
    </Text>

    <View style={styles.pillRowWrap}>

        {DELIVERY_TIME.map((time) => (

            <TouchableOpacity
                key={time}
                activeOpacity={0.85}
                onPress={() =>
                    setDeliveryTime(time)
                }
                style={[
                    styles.pill,
                    deliveryTime === time &&
                    styles.pillSelected,
                ]}
            >

                <FontAwesome5
                    name="clock"
                    size={13}
                    style={[
                        styles.pillIcon,
                        deliveryTime === time &&
                        styles.pillIconSelected,
                    ]}
                />

                <Text
                    style={[
                        styles.pillText,
                        deliveryTime === time &&
                        styles.pillTextSelected,
                    ]}
                >
                    {time}
                </Text>

            </TouchableOpacity>

        ))}

    </View>

    <View
        style={{
            marginTop: 14,
            backgroundColor: "#FBEFF7",
            borderRadius: 12,
            padding: 12,
            flexDirection: "row",
            alignItems: "center",
        }}
    >

        <FontAwesome5
            name="hourglass-half"
            size={14}
            color="#780C60"
        />

        <Text
            style={{
                marginLeft: 8,
                flex: 1,
                fontSize: 12,
                color: "#7A5A71",
                lineHeight: 18,
            }}
        >
            Faster delivery improves customer satisfaction.
            Choose the average time you usually take to
            deliver the final edited work.
        </Text>

    </View>

</View>
{/* =========================
      Minimum Price
========================= */}

<View style={styles.card}>

    <SectionTitle
        icon="tags"
        title="Starting Price"
        required
    />

    <Text style={styles.hint}>
        Enter your starting package price
    </Text>

    <View style={styles.inputRow}>

        <Text style={styles.currencyPrefix}>
            Rs.
        </Text>

        <TextInput
            style={styles.inputFlex}
            keyboardType="numeric"
            placeholder="e.g. 15000"
            placeholderTextColor="#B99DAF"
            value={minimumPrice}
            onChangeText={setMinimumPrice}
        />

    </View>

</View>

{/* =========================
      Description
========================= */}

<View style={styles.card}>

    <SectionTitle
        icon="align-left"
        title="Business Description"
        required
    />

    <Text style={styles.hint}>
        Tell customers about your photography or videography services.
    </Text>

    <TextInput
        style={[
            styles.input,
            styles.textArea,
        ]}
        multiline
        numberOfLines={5}
        textAlignVertical="top"
        placeholder="Example:
• Wedding Photography
• Cinematic Videography
• Drone Coverage
• Premium Album Design"
        placeholderTextColor="#B99DAF"
        value={description}
        onChangeText={setDescription}
    />

</View>

{/* =========================
      Additional Information
========================= */}

<View style={styles.card}>

    <SectionTitle
        icon="sticky-note"
        title="Additional Information"
    />

    <Text style={styles.hint}>
        Optional details that customers should know.
    </Text>

    <TextInput
        style={[
            styles.input,
            styles.textArea,
        ]}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        placeholder="Example:
• Free consultation
• Free travel within city
• Same-day teaser photos
• Complimentary highlight reel"
        placeholderTextColor="#B99DAF"
        value={additionalInfo}
        onChangeText={setAdditionalInfo}
    />

    <View
        style={{
            marginTop: 14,
            backgroundColor: "#FBEFF7",
            borderRadius: 12,
            padding: 12,
            flexDirection: "row",
            alignItems: "flex-start",
        }}
    >

        <FontAwesome5
            name="lightbulb"
            size={15}
            color="#780C60"
            style={{ marginTop: 2 }}
        />

        <Text
            style={{
                marginLeft: 10,
                flex: 1,
                color: "#7A5A71",
                fontSize: 12,
                lineHeight: 18,
            }}
        >
            Mention anything that makes your service unique,
            such as drone coverage, premium cameras,
            same-day edits, destination weddings,
            albums, reels, or free consultation.
        </Text>

    </View>

</View>
{/* =========================
      Down Payment Type
========================= */}

<View style={styles.card}>

    <SectionTitle
        icon="money-bill-wave"
        title="Down Payment Type"
        required
    />

    <Text style={styles.hint}>
        Choose how booking advance will be calculated.
    </Text>

    <View style={styles.pillRow}>

        {["PERCENTAGE", "FIXED"].map((option) => (

            <TouchableOpacity
                key={option}
                activeOpacity={0.85}
                style={[
                    styles.pill,
                    downPaymentType === option &&
                        styles.pillSelected,
                ]}
                onPress={() =>
                    setDownPaymentType(
                        option as "PERCENTAGE" | "FIXED"
                    )
                }
            >

                <FontAwesome5
                    name={
                        option === "PERCENTAGE"
                            ? "percentage"
                            : "wallet"
                    }
                    size={13}
                    style={[
                        styles.pillIcon,
                        downPaymentType === option &&
                            styles.pillIconSelected,
                    ]}
                />

                <Text
                    style={[
                        styles.pillText,
                        downPaymentType === option &&
                            styles.pillTextSelected,
                    ]}
                >
                    {option}
                </Text>

            </TouchableOpacity>

        ))}

    </View>

</View>

{/* =========================
      Down Payment
========================= */}

<View style={styles.card}>

    <SectionTitle
        icon="wallet"
        title="Booking Advance"
        required
    />

    <Text style={styles.hint}>
        Enter the advance amount required to confirm a booking.
    </Text>

    <View style={styles.inputRow}>

        <Text style={styles.currencyPrefix}>
            {downPaymentType === "PERCENTAGE"
                ? "%"
                : "Rs."}
        </Text>

        <TextInput
            style={styles.inputFlex}
            keyboardType="numeric"
            placeholder={
                downPaymentType === "PERCENTAGE"
                    ? "e.g. 30"
                    : "e.g. 10000"
            }
            placeholderTextColor="#B99DAF"
            value={downPayment}
            onChangeText={setDownPayment}
        />

    </View>

</View>

{/* =========================
      Covid Compliant
========================= */}

<View style={styles.card}>

    <SectionTitle
        icon="shield-virus"
        title="Covid Safety Measures"
        required
    />

    <Text style={styles.hint}>
        Let customers know whether your team follows health and safety guidelines.
    </Text>

    <View style={styles.pillRow}>

        {["YES", "NO"].map((option) => (

            <TouchableOpacity
                key={option}
                activeOpacity={0.85}
                style={[
                    styles.pill,
                    covidCompliant === option &&
                        styles.pillSelected,
                ]}
                onPress={() =>
                    setCovidCompliant(
                        option as "YES" | "NO"
                    )
                }
            >

                <FontAwesome5
                    name={
                        option === "YES"
                            ? "shield-alt"
                            : "times-circle"
                    }
                    size={13}
                    style={[
                        styles.pillIcon,
                        covidCompliant === option &&
                            styles.pillIconSelected,
                    ]}
                />

                <Text
                    style={[
                        styles.pillText,
                        covidCompliant === option &&
                            styles.pillTextSelected,
                    ]}
                >
                    {option}
                </Text>

            </TouchableOpacity>

        ))}

    </View>

    <View
        style={{
            marginTop: 14,
            backgroundColor: "#FBEFF7",
            borderRadius: 12,
            padding: 12,
            flexDirection: "row",
            alignItems: "flex-start",
        }}
    >
        <FontAwesome5
            name="info-circle"
            size={14}
            color="#780C60"
            style={{ marginTop: 2 }}
        />

        <Text
            style={{
                marginLeft: 10,
                flex: 1,
                fontSize: 12,
                color: "#7A5A71",
                lineHeight: 18,
            }}
        >
            Vendors following safety protocols often build greater customer
            trust, especially for indoor events and large gatherings.
        </Text>

    </View>

</View>
{/* =========================
      Refund Policy
========================= */}

<View style={styles.card}>

    <SectionTitle
        icon="undo-alt"
        title="Cancellation Policy"
        required
    />

    <Text style={styles.hint}>
        Select the cancellation/refund policy for your photography services.
    </Text>

    <View style={styles.pillRowWrap}>

        {(
            [
                "REFUNDABLE",
                "NON-REFUNDABLE",
                "PARTIALLY REFUNDABLE",
            ] as const
        ).map((policy) => (

            <TouchableOpacity
                key={policy}
                activeOpacity={0.85}
                style={[
                    styles.pill,
                    refundPolicy === policy &&
                        styles.pillSelected,
                ]}
                onPress={() => setRefundPolicy(policy)}
            >

                <FontAwesome5
                    name="undo-alt"
                    size={13}
                    style={[
                        styles.pillIcon,
                        refundPolicy === policy &&
                            styles.pillIconSelected,
                    ]}
                />

                <Text
                    style={[
                        styles.pillText,
                        refundPolicy === policy &&
                            styles.pillTextSelected,
                    ]}
                >
                    {policy}
                </Text>

            </TouchableOpacity>

        ))}

    </View>

</View>

{/* =========================
      Bottom Buttons
========================= */}

<View style={styles.buttonContainer}>

    <TouchableOpacity
        activeOpacity={0.85}
        style={styles.backButton}
        onPress={() => router.back()}
    >

        <FontAwesome5
            name="arrow-left"
            size={13}
            color="#780C60"
            style={{ marginRight: 8 }}
        />

        <Text style={styles.backButtonText}>
            Back
        </Text>

    </TouchableOpacity>

    <TouchableOpacity
        activeOpacity={0.9}
        style={styles.saveButton}
        onPress={submit}
    >

        <Text style={styles.buttonText}>
    {edit === "true"
        ? "Update Details"
        : "Save & Continue"}
</Text>

        <FontAwesome5
            name="arrow-right"
            size={13}
            color="#FFF"
            style={{ marginLeft: 8 }}
        />

    </TouchableOpacity>

</View>

<View style={{ height: 35 }} />
        </ScrollView>
    );
};

export default BusinessDetailsScreen;

const styles = StyleSheet.create({
  /* ==========================
        Container
  ========================== */

  container: {
    flexGrow: 1,
    backgroundColor: "#FDF4F8",
    paddingHorizontal: 20,
    paddingTop: 65,
    paddingBottom: 40,
  },

  /* ==========================
        Header
  ========================== */

  headerWrap: {
    alignItems: "center",
    marginBottom: 26,
  },

  headerIconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#F7DCEC",
    justifyContent: "center",
    alignItems: "center",

    shadowColor: "#780C60",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,

    marginBottom: 14,
  },

  header: {
    fontSize: 26,
    fontWeight: "800",
    color: "#2A1B26",
    textAlign: "center",
    letterSpacing: 0.4,
  },

  subHeader: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 14,
    color: "#8B7B88",
    lineHeight: 22,
    maxWidth: 310,
  },

  /* ==========================
        Progress Dots
  ========================== */

  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
  },

  dot: {
    width: 7,
    height: 7,
    borderRadius: 10,
    backgroundColor: "#EFCFE2",
    marginHorizontal: 3,
  },

  dotAccent: {
    width: 22,
    backgroundColor: "#780C60",
  },

  /* ==========================
        Cards
  ========================== */

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,

    shadowColor: "#780C60",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },

  /* ==========================
        Section Title
  ========================== */

  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },

  sectionIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#FBEFF7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  label: {
    fontSize: 15,
    fontWeight: "700",
    color: "#2A1B26",
    flex: 1,
  },

  requiredStar: {
    color: "#D63384",
    fontWeight: "bold",
  },

  hint: {
    marginLeft: 40,
    marginBottom: 12,
    fontSize: 12,
    color: "#AA93A4",
    lineHeight: 18,
  },

    /* ==========================
        Inputs
  ========================== */

  input: {
    borderWidth: 1.5,
    borderColor: "#F1DCEA",
    borderRadius: 14,
    backgroundColor: "#FFFCFE",

    paddingHorizontal: 15,
    paddingVertical: 12,

    fontSize: 14,
    color: "#2A1B26",

    marginTop: 8,
  },

  inputFocused: {
    borderColor: "#780C60",
  },

  textArea: {
    minHeight: 110,
    textAlignVertical: "top",
    paddingTop: 12,
    lineHeight: 22,
  },

  /* ==========================
        Input Row
  ========================== */

  inputRow: {
    flexDirection: "row",
    alignItems: "center",

    borderWidth: 1.5,
    borderColor: "#F1DCEA",
    borderRadius: 14,

    backgroundColor: "#FFFCFE",

    marginTop: 8,
    paddingHorizontal: 15,
    paddingVertical: 2,
  },

  inputFlex: {
    flex: 1,

    fontSize: 14,
    color: "#2A1B26",

    paddingVertical: 11,
    paddingHorizontal: 6,
  },

  /* ==========================
        Currency Prefix
  ========================== */

  currencyPrefix: {
    fontSize: 15,
    fontWeight: "700",
    color: "#780C60",

    marginRight: 6,
  },

  /* ==========================
        Small Input Label
  ========================== */

  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#5C4955",

    marginBottom: 6,
  },

  /* ==========================
        Placeholder Helper
  ========================== */

  helperText: {
    marginTop: 6,
    marginLeft: 4,

    fontSize: 11,
    color: "#B099A8",
  },
    /* ==========================
        Multi Select Chips
  ========================== */

  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
  },

  chip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    backgroundColor: "#FFFCFE",

    borderWidth: 1.5,
    borderColor: "#F1DCEA",

    borderRadius: 14,

    paddingHorizontal: 15,
    paddingVertical: 11,

    marginRight: 10,
    marginBottom: 10,

    position: "relative",

    shadowColor: "#780C60",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },

  chipSelected: {
    backgroundColor: "#780C60",
    borderColor: "#780C60",

    shadowColor: "#780C60",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.20,
    shadowRadius: 8,
    elevation: 5,
  },

  chipIcon: {
    color: "#780C60",
    fontSize: 15,
    marginRight: 8,
  },

  chipIconSelected: {
    color: "#FFFFFF",
  },

  chipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#780C60",
    letterSpacing: 0.3,
  },

  chipTextSelected: {
    color: "#FFFFFF",
  },

  /* ==========================
        Selected Check Badge
  ========================== */

  checkBadge: {
    position: "absolute",

    top: -6,
    right: -6,

    width: 18,
    height: 18,

    borderRadius: 9,

    backgroundColor: "#FFFFFF",

    justifyContent: "center",
    alignItems: "center",

    borderWidth: 1,
    borderColor: "#EFD7E8",

    shadowColor: "#780C60",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
    /* ==========================
        Pills (Single Select)
  ========================== */

  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
  },

  pillRowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
  },

  pill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    backgroundColor: "#FFFCFE",

    borderWidth: 1.5,
    borderColor: "#F1DCEA",

    borderRadius: 14,

    paddingHorizontal: 16,
    paddingVertical: 11,

    marginRight: 10,
    marginBottom: 10,

    shadowColor: "#780C60",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  pillSelected: {
    backgroundColor: "#780C60",
    borderColor: "#780C60",

    shadowColor: "#780C60",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 5,
  },

  pillIcon: {
    color: "#780C60",
    fontSize: 14,
    marginRight: 8,
  },

  pillIconSelected: {
    color: "#FFFFFF",
  },

  pillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#780C60",
    letterSpacing: 0.3,
  },

  pillTextSelected: {
    color: "#FFFFFF",
  },

  /* ==========================
        Bottom Buttons
  ========================== */

  buttonContainer: {
    flexDirection: "row",
    marginTop: 18,
    gap: 12,
  },

  backButton: {
    flex: 1,

    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",

    borderWidth: 1.5,
    borderColor: "#780C60",

    backgroundColor: "#FFFFFF",

    borderRadius: 16,
    paddingVertical: 15,

    shadowColor: "#780C60",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },

  backButtonText: {
    color: "#780C60",
    fontWeight: "700",
    fontSize: 14,
  },

  saveButton: {
    flex: 1.5,

    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",

    backgroundColor: "#780C60",

    borderRadius: 16,
    paddingVertical: 15,

    shadowColor: "#780C60",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 8,
  },

  buttonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
    letterSpacing: 0.3,
  },

  /* ==========================
        Common Text
  ========================== */

  valueText: {
    fontSize: 14,
    color: "#2A1B26",
    fontWeight: "600",
  },

  caption: {
    fontSize: 11,
    color: "#A18B99",
    marginTop: 5,
    lineHeight: 16,
  },
});