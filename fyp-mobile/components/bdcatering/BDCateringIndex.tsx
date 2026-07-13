import postCateringBusinessDetails from "@/services/postCateringBusinessDetails";
import { getSecureData } from "@/store";
import { FontAwesome5 } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const EXPERTISE_TYPES = [
  { label: "WEDDING", icon: "glass-cheers" },
  { label: "ENGAGEMENT", icon: "ring" },
  { label: "BIRTHDAY", icon: "birthday-cake" },
  { label: "CORPORATE", icon: "briefcase" },
  { label: "BBQ", icon: "utensils" },
  { label: "BUFFET", icon: "hamburger" },
];

const CITY_OPTIONS = [
  "Islamabad",
  "Rawalpindi",
  "Lahore",
  "Karachi",
  "Peshawar",
  "Faisalabad",
];

const STAFF_GENDERS = [
  { label: "MALE", icon: "male" },
  { label: "FEMALE", icon: "female" },
  { label: "TRANSGENDER", icon: "transgender-alt" },
];

const SERVICES = [
  {
    key: "foodTesting",
    title: "Food Testing",
    icon: "flask",
  },
  {
    key: "soundSystem",
    title: "Sound System",
    icon: "volume-up",
  },
  {
    key: "decoration",
    title: "Decoration",
    icon: "palette",
  },
  {
    key: "seatingArrangement",
    title: "Seating",
    icon: "chair",
  },
  {
    key: "waiters",
    title: "Waiters",
    icon: "user-tie",
  },
  {
    key: "cutlery",
    title: "Cutlery",
    icon: "utensils",
  },
];

const BusinessDetailsForm = () => {
    const [expertise, setExpertise] = useState<string[]>([]);
const [travelsToClientHome, setTravelsToClientHome] =
  useState<"YES" | "NO" | null>(null);

const [selectedCities, setSelectedCities] = useState<string[]>([]);
const [staffGender, setStaffGender] = useState<string[]>([]);

const [foodTesting, setFoodTesting] = useState(false);
const [soundSystem, setSoundSystem] = useState(false);
const [decoration, setDecoration] = useState(false);
const [seatingArrangement, setSeatingArrangement] = useState(false);
const [waiters, setWaiters] = useState(false);
const [cutlery, setCutlery] = useState(false);

const [minimumPrice, setMinimumPrice] = useState("");
const [description, setDescription] = useState("");
const [additionalInfo, setAdditionalInfo] = useState("");

const [downPaymentType, setDownPaymentType] =
  useState<"PERCENTAGE" | "FIXED" | null>(null);

const [downPayment, setDownPayment] = useState("");

const [cancellationPolicy, setCancellationPolicy] =
  useState<
    | "REFUNDABLE"
    | "NON-REFUNDABLE"
    | "PARTIALLY REFUNDABLE"
    | null
  >(null);

const [covidCompliant, setCovidCompliant] =
  useState<"YES" | "NO" | null>(null);
  const toggleExpertise = (item: string) => {
  setExpertise((prev) =>
    prev.includes(item)
      ? prev.filter((i) => i !== item)
      : [...prev, item]
  );
};

const toggleCity = (city: string) => {
  setSelectedCities((prev) =>
    prev.includes(city)
      ? prev.filter((i) => i !== city)
      : [...prev, city]
  );
};

const toggleStaff = (staff: string) => {
  setStaffGender((prev) =>
    prev.includes(staff)
      ? prev.filter((i) => i !== staff)
      : [...prev, staff]
  );
};
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
      <FontAwesome5
        name={icon}
        size={12}
        color="#780C60"
      />
    </View>

    <Text style={styles.label}>
      {title}
      {required && (
        <Text style={styles.requiredStar}> *</Text>
      )}
    </Text>
  </View>
);

const submit = async () => {

    if (
        expertise.length === 0 ||
        selectedCities.length === 0 ||
        staffGender.length === 0 ||
        !minimumPrice ||
        !description ||
        !downPaymentType ||
        !downPayment ||
        !covidCompliant ||
        !cancellationPolicy ||
        travelsToClientHome === null
    ) {
        Alert.alert(
            "Error",
            "Please complete all required fields."
        );
        return;
    }

    try {

        const user = JSON.parse(
            (await getSecureData("user")) || ""
        );

        await postCateringBusinessDetails(
            user._id,
            {

                expertise,

                travelsToClientHome:
                    travelsToClientHome === "YES",

                cityCovered: selectedCities,

                staff: staffGender,

                provideFoodTesting:
                    foodTesting,

                provideDecoration:
                    decoration,

                provideSoundSystem:
                    soundSystem,

                provideSeatingArrangement:
                    seatingArrangement,

                provideWaiters:
                    waiters,

                provideCutleryAndPlates:
                    cutlery,

                minimumPrice:
                    Number(minimumPrice),

                description,

                additionalInfo,

                downPaymentType,

                downPayment:
                    Number(downPayment),

                cancellationPolicy,

                covidCompliant,

            }
        );

        Alert.alert(
            "Success",
            "Business details saved successfully!"
        );

        router.push("/packages");

    } catch (err) {

        console.log(err);

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

<View style={styles.headerWrap}>

<View style={styles.headerIconBadge}>
<FontAwesome5
name="utensils"
size={22}
color="#780C60"
/>
</View>

<Text style={styles.header}>
Catering Business
</Text>

<Text style={styles.subHeader}>
Tell customers about your catering services.
Select everything you provide.
</Text>

<View style={styles.dotsRow}>
{[0,1,2,3,4].map((i)=>(
<View
key={i}
style={[
styles.dot,
i===2 && styles.dotAccent
]}
/>
))}
</View>

</View>
{/* ============================
        Expertise
============================= */}
<View style={styles.card}>
    <SectionTitle
        icon="utensils"
        title="Expertise"
        required
    />

    <Text style={styles.hint}>
        Select all services you provide
    </Text>

    <View style={styles.chipContainer}>
        {EXPERTISE_TYPES.map((item) => {
            const selected = expertise.includes(item.label);

            return (
                <TouchableOpacity
                    key={item.label}
                    activeOpacity={0.85}
                    style={[
                        styles.chip,
                        selected && styles.chipSelected,
                    ]}
                    onPress={() => toggleExpertise(item.label)}
                >
                    <FontAwesome5
                        name={item.icon}
                        size={16}
                        style={[
                            styles.chipIcon,
                            selected &&
                                styles.chipIconSelected,
                        ]}
                    />

                    <Text
                        style={[
                            styles.chipText,
                            selected &&
                                styles.chipTextSelected,
                        ]}
                    >
                        {item.label}
                    </Text>
                </TouchableOpacity>
            );
        })}
    </View>
</View>

{/* ============================
        Travels
============================= */}

<View style={styles.card}>
    <SectionTitle
        icon="route"
        title="Travels to Client Home"
        required
    />

    <View style={styles.pillRow}>
        {["YES", "NO"].map((option) => (
            <TouchableOpacity
                key={option}
                style={[
                    styles.pill,
                    travelsToClientHome === option &&
                        styles.pillSelected,
                ]}
                onPress={() =>
                    setTravelsToClientHome(
                        option as "YES" | "NO"
                    )
                }
            >
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

{/* ============================
        Cities
============================= */}

<View style={styles.card}>
    <SectionTitle
        icon="map-marker-alt"
        title="Cities Covered"
        required
    />

    <Text style={styles.hint}>
        Select multiple cities
    </Text>

    <View style={styles.chipContainer}>
        {CITY_OPTIONS.map((city) => {
            const selected =
                selectedCities.includes(city);

            return (
                <TouchableOpacity
                    key={city}
                    style={[
                        styles.chip,
                        selected &&
                            styles.chipSelected,
                    ]}
                    onPress={() =>
                        toggleCity(city)
                    }
                >
                    <FontAwesome5
                        name="map-marker-alt"
                        size={14}
                        style={[
                            styles.chipIcon,
                            selected &&
                                styles.chipIconSelected,
                        ]}
                    />

                    <Text
                        style={[
                            styles.chipText,
                            selected &&
                                styles.chipTextSelected,
                        ]}
                    >
                        {city}
                    </Text>
                </TouchableOpacity>
            );
        })}
    </View>
</View>

{/* ============================
        Staff
============================= */}

<View style={styles.card}>
    <SectionTitle
        icon="users"
        title="Available Staff"
        required
    />

    <Text style={styles.hint}>
        Select all that apply
    </Text>

    <View style={styles.chipContainer}>
        {STAFF_GENDERS.map((staff) => {
            const selected =
                staffGender.includes(staff.label);

            return (
                <TouchableOpacity
                    key={staff.label}
                    style={[
                        styles.chip,
                        selected &&
                            styles.chipSelected,
                    ]}
                    onPress={() =>
                        toggleStaff(staff.label)
                    }
                >
                    <FontAwesome5
                        name={staff.icon}
                        size={16}
                        style={[
                            styles.chipIcon,
                            selected &&
                                styles.chipIconSelected,
                        ]}
                    />

                    <Text
                        style={[
                            styles.chipText,
                            selected &&
                                styles.chipTextSelected,
                        ]}
                    >
                        {staff.label}
                    </Text>
                </TouchableOpacity>
            );
        })}
    </View>
</View>

{/* ============================
        Catering Services
============================= */}

<View style={styles.card}>
    <SectionTitle
        icon="concierge-bell"
        title="Services Included"
        required
    />

    <View style={styles.chipContainer}>

        {SERVICES.map((service) => {

            const value =
                ({
                    foodTesting,
                    soundSystem,
                    decoration,
                    seatingArrangement,
                    waiters,
                    cutlery,
                } as any)[service.key];

            return (
                <TouchableOpacity
                    key={service.key}
                    style={[
                        styles.chip,
                        value &&
                            styles.chipSelected,
                    ]}
                    onPress={() => {

                        switch (service.key) {

                            case "foodTesting":
                                setFoodTesting(!foodTesting);
                                break;

                            case "soundSystem":
                                setSoundSystem(!soundSystem);
                                break;

                            case "decoration":
                                setDecoration(!decoration);
                                break;

                            case "seatingArrangement":
                                setSeatingArrangement(
                                    !seatingArrangement
                                );
                                break;

                            case "waiters":
                                setWaiters(!waiters);
                                break;

                            case "cutlery":
                                setCutlery(!cutlery);
                                break;
                        }
                    }}
                >
                    <FontAwesome5
                        name={service.icon}
                        size={15}
                        style={[
                            styles.chipIcon,
                            value &&
                                styles.chipIconSelected,
                        ]}
                    />

                    <Text
                        style={[
                            styles.chipText,
                            value &&
                                styles.chipTextSelected,
                        ]}
                    >
                        {service.title}
                    </Text>
                </TouchableOpacity>
            );
        })}
    </View>
</View>

{/* ============================
        Minimum Price
============================= */}

<View style={styles.card}>
    <SectionTitle
        icon="tag"
        title="Minimum Price"
    />

    <View style={styles.inputRow}>
        <Text style={styles.currencyPrefix}>
            Rs.
        </Text>

        <TextInput
            style={styles.inputFlex}
            keyboardType="numeric"
            placeholder="Enter Minimum Price"
            value={minimumPrice}
            onChangeText={setMinimumPrice}
        />
    </View>
</View>

{/* ============================
        Description
============================= */}

<View style={styles.card}>
    <SectionTitle
        icon="align-left"
        title="Description"
        required
    />

    <TextInput
        multiline
        value={description}
        onChangeText={setDescription}
        style={[
            styles.input,
            styles.textArea,
        ]}
        placeholder="Describe your catering service..."
    />
</View>

{/* ============================
        Additional Info
============================= */}

<View style={styles.card}>
    <SectionTitle
        icon="sticky-note"
        title="Additional Info"
    />

    <TextInput
        multiline
        value={additionalInfo}
        onChangeText={setAdditionalInfo}
        style={[
            styles.input,
            styles.textArea,
        ]}
        placeholder="Any extra information..."
    />
</View>
{/* ============================
        Down Payment Type
============================= */}

<View style={styles.card}>
    <SectionTitle
        icon="money-bill-wave"
        title="Down Payment Type"
        required
    />

    <View style={styles.pillRow}>
        {["PERCENTAGE", "FIXED"].map((option) => (
            <TouchableOpacity
                key={option}
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

{/* Down Payment */}

<View style={styles.card}>
    <SectionTitle
        icon="wallet"
        title="Down Payment"
        required
    />

    <View style={styles.inputRow}>
        <Text style={styles.currencyPrefix}>
            Rs.
        </Text>

        <TextInput
            style={styles.inputFlex}
            keyboardType="numeric"
            placeholder="Enter Down Payment"
            value={downPayment}
            onChangeText={setDownPayment}
        />
    </View>
</View>

{/* Covid */}

<View style={styles.card}>
    <SectionTitle
        icon="shield-virus"
        title="Covid Compliant"
        required
    />

    <View style={styles.pillRow}>
        {["YES", "NO"].map((option) => (
            <TouchableOpacity
                key={option}
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
</View>

{/* Cancellation */}

<View style={styles.card}>
    <SectionTitle
        icon="undo-alt"
        title="Cancellation Policy"
        required
    />

    <View style={styles.pillRowWrap}>
        {[
            "REFUNDABLE",
            "NON-REFUNDABLE",
            "PARTIALLY REFUNDABLE",
        ].map((policy) => (
            <TouchableOpacity
                key={policy}
                style={[
                    styles.pill,
                    cancellationPolicy === policy &&
                        styles.pillSelected,
                ]}
                onPress={() =>
                    setCancellationPolicy(
                        policy as any
                    )
                }
            >
                <Text
                    style={[
                        styles.pillText,
                        cancellationPolicy ===
                            policy &&
                            styles.pillTextSelected,
                    ]}
                >
                    {policy}
                </Text>
            </TouchableOpacity>
        ))}
    </View>
</View>

{/* Buttons */}

<View style={styles.buttonContainer}>
    <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
    >
        <Text style={styles.backButtonText}>
            Back
        </Text>
    </TouchableOpacity>

    <TouchableOpacity
        style={styles.saveButton}
        onPress={submit}
    >
        <Text style={styles.buttonText}>
            Save & Continue
        </Text>

        <FontAwesome5
            name="arrow-right"
            size={13}
            color="#FFF"
            style={{ marginLeft: 8 }}
        />
    </TouchableOpacity>
</View>

<View style={{ height: 40 }} />
</ScrollView>
);
};

export default BusinessDetailsForm;

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#FDF4F8",
    flexGrow: 1,
    paddingTop: 65,
    paddingBottom: 40,
  },

  /* Header */

  headerWrap: {
    alignItems: "center",
    marginBottom: 24,
  },

  headerIconBadge: {
    width: 55,
    height: 55,
    borderRadius: 28,
    backgroundColor: "#F4D8EC",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },

  header: {
    fontSize: 24,
    fontWeight: "800",
    color: "#2A1B26",
  },

  subHeader: {
    fontSize: 14,
    color: "#8A7A85",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },

  dotsRow: {
    flexDirection: "row",
    marginTop: 16,
    gap: 6,
  },

  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#F0D3E6",
  },

  dotAccent: {
    width: 18,
    backgroundColor: "#780C60",
  },

  /* Cards */

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,

    shadowColor: "#780C60",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },

  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  sectionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#FBEFF7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  label: {
    fontSize: 15,
    fontWeight: "700",
    color: "#2A1B26",
  },

  requiredStar: {
    color: "#D63384",
  },

  hint: {
    color: "#A18A97",
    fontSize: 12,
    marginBottom: 12,
    marginLeft: 38,
  },

  /* Chips */

  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEFBFD",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#F0DCEA",
    paddingVertical: 10,
    paddingHorizontal: 14,
  },

  chipSelected: {
    backgroundColor: "#780C60",
    borderColor: "#780C60",
  },

  chipIcon: {
    color: "#780C60",
    marginRight: 8,
  },

  chipIconSelected: {
    color: "#FFFFFF",
  },

  chipText: {
    color: "#780C60",
    fontWeight: "700",
    fontSize: 12,
  },

  chipTextSelected: {
    color: "#FFFFFF",
  },

  /* Pills */

  pillRow: {
    flexDirection: "row",
    gap: 10,
  },

  pillRowWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  pill: {
    borderWidth: 1.5,
    borderColor: "#F0DCEA",
    backgroundColor: "#FEFBFD",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },

  pillSelected: {
    backgroundColor: "#780C60",
    borderColor: "#780C60",
  },

  pillText: {
    color: "#780C60",
    fontWeight: "700",
    fontSize: 12,
  },

  pillTextSelected: {
    color: "#FFFFFF",
  },

  /* Inputs */

  input: {
    borderWidth: 1.5,
    borderColor: "#F0DCEA",
    borderRadius: 12,
    backgroundColor: "#FEFBFD",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#2A1B26",
  },

  textArea: {
    minHeight: 90,
    textAlignVertical: "top",
  },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#F0DCEA",
    borderRadius: 12,
    backgroundColor: "#FEFBFD",
    paddingHorizontal: 12,
  },

  currencyPrefix: {
    color: "#780C60",
    fontWeight: "700",
    fontSize: 14,
    marginRight: 6,
  },

  inputFlex: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: "#2A1B26",
  },

  /* Buttons */

  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },

  backButton: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#780C60",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },

  backButtonText: {
    color: "#780C60",
    fontWeight: "700",
    fontSize: 14,
  },

  saveButton: {
    flex: 1.4,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#780C60",
    borderRadius: 14,
    paddingVertical: 14,

    shadowColor: "#780C60",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },

  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
});