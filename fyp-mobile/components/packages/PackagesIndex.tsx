import { PackageDto } from "@/dto/CreatePackage.dto";
import postAddPackages from "@/services/postAddPackages";
import { getSecureData } from "@/store";
import { router } from "expo-router";
import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
} from "react-native";


const PackagesScreen: React.FC = () => {

    const [packages, setPackages] = useState<PackageDto[]>([]);


    const addPackage = () => {
        if (packages.length < 10) {
            setPackages([
                ...packages,
                {
                    packageName: "",
                    price: 0,
                    services: "",
                },
            ]);
        }
    };


    const removePackage = (index: number) => {
        const updatedPackages = [...packages];
        updatedPackages.splice(index, 1);
        setPackages(updatedPackages);
    };


    const updatePackage = (
        index: number,
        field: string,
        value: string
    ) => {

        const updatedPackages = [...packages];

        updatedPackages[index] = {
            ...updatedPackages[index],
            [field]:
                field === "price"
                    ? Number(value)
                    : value,
        };

        setPackages(updatedPackages);
    };


    const onSubmit = async () => {

        const user = JSON.parse(
            await getSecureData("user") || ""
        );

        console.log(user);

        await postAddPackages(
            user._id,
            {
                packages: packages,
            }
        );

        router.push("/imagesuploaded");
    };



    return (

        <View style={styles.container}>


            {/* Header */}

            <View style={styles.headerContainer}>

    <Text style={styles.header}>
        Create Packages
    </Text>


    <Text style={styles.subHeader}>
        Create customized packages and showcase
        your services beautifully to customers.
    </Text>


    <View style={styles.limitBadge}>
        <Text style={styles.packageLimit}>
            ✨ You can create up to 10 packages
        </Text>
    </View>


</View>



            <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.scrollContainer}
            >


                {
                    packages.map((pkg, index) => (

                        <View
                            key={index}
                            style={styles.packageContainer}
                        >


                            <Text style={styles.packageTitle}>
                                Package {index + 1}
                            </Text>



                            <View style={styles.row}>


                                <View style={styles.inputWrapper}>

                                    <Text style={styles.label}>
                                        Package Name
                                    </Text>


                                    <TextInput
                                        style={styles.input}
                                        placeholder="e.g. Premium Wedding Package"
                                        placeholderTextColor="#999"
                                        value={pkg.packageName}
                                        onChangeText={(text)=>
                                            updatePackage(
                                                index,
                                                "packageName",
                                                text
                                            )
                                        }
                                    />

                                </View>



                                <View
                                    style={[
                                        styles.inputWrapper,
                                        styles.priceWrapper
                                    ]}
                                >

                                    <Text style={styles.label}>
                                        Price
                                    </Text>


                                    <TextInput
                                        style={styles.input}
                                        placeholder="PKR"
                                        placeholderTextColor="#999"
                                        keyboardType="numeric"
                                        value={pkg.price.toString()}
                                        onChangeText={(text)=>
                                            updatePackage(
                                                index,
                                                "price",
                                                text
                                            )
                                        }
                                    />


                                </View>


                            </View>





                            <Text style={styles.label}>
                                Services Included
                            </Text>


                            <TextInput
                                style={[
                                    styles.input,
                                    styles.servicesInput
                                ]}
                                placeholder="Describe services included in this package..."
                                placeholderTextColor="#999"
                                multiline
                                value={pkg.services}
                                onChangeText={(text)=>
                                    updatePackage(
                                        index,
                                        "services",
                                        text
                                    )
                                }
                            />



                            <TouchableOpacity
                                onPress={() =>
                                    removePackage(index)
                                }
                                style={styles.deleteButton}
                            >

                                <Text style={styles.deleteText}>
                                    🗑 Remove Package
                                </Text>

                            </TouchableOpacity>



                        </View>

                    ))
                }





                <View style={styles.addButtonContainer}>


                    <View style={styles.line}/>


                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={addPackage}
                    >

                        <Text style={styles.addButtonText}>
                            + Create New Package
                        </Text>

                    </TouchableOpacity>


                    <View style={styles.line}/>


                </View>



            </ScrollView>





            <View style={styles.footer}>


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
                    onPress={onSubmit}
                >

                    <Text style={styles.saveButtonText}>
                        Save & Continue
                    </Text>

                </TouchableOpacity>


            </View>


        </View>

    );
};


export default PackagesScreen;

const styles = StyleSheet.create({

    container: {
        flex: 1,
        backgroundColor: "#FCF6FA",
        paddingHorizontal: 20,
        paddingTop: 65,
        paddingBottom: 25,
    },


    // Header

    headerContainer: {
    alignItems: "center",
    marginBottom: 25,
},


    header: {
    fontSize: 30,
    fontWeight: "800",
    color: "#780C60",
    marginBottom: 10,
    textAlign: "center",
},


    subHeader: {
    fontSize: 15,
    color: "#666",
    lineHeight: 22,
    textAlign: "center",
    paddingHorizontal: 10,
},

    packageLimit: {
        fontSize: 14,
        color: "#780C60",
        fontWeight: "600",
    },

limitBadge: {
    marginTop: 15,

    backgroundColor: "#F9E7F3",

    paddingHorizontal: 18,
    paddingVertical: 8,

    borderRadius: 20,
},

    // Scroll

    scrollContainer: {
        flex: 1,
    },



    // Package Card

    packageContainer: {
        backgroundColor: "#FFFFFF",

        borderRadius: 22,

        padding: 18,

        marginBottom: 18,


        borderWidth: 1,
        borderColor: "#F1D5E8",


        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: {
            width: 0,
            height: 5,
        },

        elevation: 5,
    },


    packageTitle: {
        fontSize: 18,
        fontWeight: "800",
        color: "#780C60",

        marginBottom: 15,
    },



    // Inputs Row

    row: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 15,
    },


    inputWrapper: {
        flex: 1,
    },


    priceWrapper: {
        marginLeft: 12,
    },



    label: {
        fontSize: 13,
        fontWeight: "700",
        color: "#555",

        marginBottom: 7,
    },



    input: {
        backgroundColor: "#FAF7FA",

        borderWidth: 1,
        borderColor: "#E6D3E2",

        borderRadius: 14,

        paddingHorizontal: 14,
        paddingVertical: 13,

        fontSize: 14,

        color: "#333",
    },



    servicesInput: {

        height: 100,

        textAlignVertical: "top",

        paddingTop: 14,
    },



    // Delete Button

    deleteButton: {

        alignSelf: "flex-end",

        marginTop: 15,

        paddingHorizontal: 15,

        paddingVertical: 8,

        borderRadius: 20,

        backgroundColor: "#FFF0F4",

    },


    deleteText: {

        color: "#D64545",

        fontSize: 13,

        fontWeight: "700",

    },





    // Add Package Button


    addButtonContainer: {

        flexDirection: "row",

        alignItems: "center",

        marginVertical: 20,

    },


    line: {

        flex: 1,

        height: 1,

        backgroundColor: "#E6C9DC",

    },


    addButton: {

        backgroundColor: "#780C60",

        paddingHorizontal: 22,

        paddingVertical: 13,

        borderRadius: 30,


        marginHorizontal: 12,


        shadowColor: "#780C60",

        shadowOpacity: 0.25,

        shadowRadius: 8,

        shadowOffset: {
            width:0,
            height:4,
        },

        elevation:5,

    },


    addButtonText: {

        color:"#FFFFFF",

        fontSize:14,

        fontWeight:"700",

    },





    // Footer Buttons


    footer: {

        flexDirection:"row",

        marginTop:15,

    },



    backButton: {

        flex:1,

        backgroundColor:"#FFFFFF",

        borderWidth:1.5,

        borderColor:"#780C60",

        borderRadius:16,


        paddingVertical:16,


        alignItems:"center",

        justifyContent:"center",


        marginRight:10,

    },



    backButtonText: {

        color:"#780C60",

        fontSize:16,

        fontWeight:"700",

    },





    saveButton: {

        flex:1,


        backgroundColor:"#780C60",


        borderRadius:16,


        paddingVertical:16,


        alignItems:"center",

        justifyContent:"center",


        marginLeft:10,



        shadowColor:"#780C60",

        shadowOpacity:0.35,

        shadowRadius:8,

        shadowOffset:{
            width:0,
            height:4,
        },

        elevation:6,

    },



    saveButtonText: {

        color:"#FFFFFF",

        fontSize:16,

        fontWeight:"700",

    },


});
