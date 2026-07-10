import getAllCategories from '@/services/getAllCategories';
import { saveSecureData } from '@/store';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Easing,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { ICategory } from '../dashboard/CategoryGrid';
import { Asset } from '@/__mocks__/expo-asset';

const BusinessSelectionIndex: React.FC = () => {
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null); // Track selected category
    const [flippedCard, setFlippedCard] = useState<string | null>(null);
    const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(null); // Track selected category
    const [categories, setCategories] = useState<ICategory[]>([]);
    const image = require('@/assets/images/GetStarted.png');
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(40)).current;
 
    useEffect(() => {
    getCategories();

    Animated.parallel([
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
            easing: Easing.out(Easing.ease),
        }),
        Animated.timing(slideAnim, {
            toValue: 0,
            duration: 900,
            useNativeDriver: true,
            easing: Easing.out(Easing.ease),
        }),
    ]).start();

        }, []);

    const getCategories = async () => {
  try {
    const response = await getAllCategories();

    console.log("Categories Response:", response);

    setCategories(response);
  } catch (error) {
    console.log("Category Error:", error);
  }
};

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Animated.View
    style={[
        styles.header,
        {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
        },
    ]}
>

    <View style={styles.textContainer}>

        <Text style={styles.title}>
            Build Your{"\n"}
            <Text style={styles.titleHighlight}>Dream Business</Text>
        </Text>

        <Text style={styles.subtitle}>
            Select the category that best describes your business and
            start connecting with thousands of customers through
            <Text style={{ fontWeight: 'bold' }}> Eventify Hub.</Text>
        </Text>

        </View>

        <View style={styles.logoWrapper}>
        <Image
            source={image}
            style={styles.logo}
        />
            </View>

        </Animated.View>

            <View style={styles.gridContainer}>
    {categories.map((category, index) => (

        <Animated.View
            key={category._id}
            style={{
                opacity: fadeAnim,
                transform: [
                    {
                        translateY: slideAnim.interpolate({
                            inputRange: [0, 40],
                            outputRange: [0, 40 + index * 3],
                        }),
                    },
                    {
                        scale:
                            selectedCategory === category._id
                                ? 1.05
                                : 1,
                    },
                ],
            }}
        >

               <TouchableOpacity
    activeOpacity={0.9}
    style={[
        styles.card,
        selectedCategory === category._id &&
            styles.selectedCard,
    ]}
    onPress={() => {

        setSelectedCategory(category._id);
        setSelectedCategoryName(category.name);

        if (flippedCard === category._id) {
            setFlippedCard(null);
        } else {
            setFlippedCard(category._id);
        }

    }}
>

<Image
    source={{ uri: category.image }}
    style={styles.icon}
/>

<Text
    style={[
        styles.cardText,
        selectedCategory === category._id &&
            styles.selectedCardText,
    ]}
>
    {category.name}
</Text>

{

flippedCard === category._id && (

<Text
    style={styles.description}
>
    {category.description}
</Text>

)

}

</TouchableOpacity>

        </Animated.View>

    ))}
</View>

            <View style={styles.footer}>

    <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => router.push('/intro')}
    >
        <Text style={styles.cancelText}>Cancel</Text>
    </TouchableOpacity>

    <TouchableOpacity
        style={[
            styles.nextButton,
            !selectedCategory &&
                styles.disabledNextButton,
        ]}
        disabled={!selectedCategory}
        onPress={async () => {

            if (selectedCategory && selectedCategoryName) {

                await saveSecureData(
                    "buisness",
                    selectedCategory.toString()
                );

                await saveSecureData(
                    "buisnessName",
                    selectedCategoryName
                );

                router.push('/signup');
            }

        }}
    >
        <Text style={styles.nextText}>
            Continue →
        </Text>

    </TouchableOpacity>

</View>

            <Text style={styles.loginText}>
                Already a Member?{' '}
                <TouchableOpacity onPress={() => router.push('/login')}>
                    <Text style={styles.loginLink}>Log in</Text>
                </TouchableOpacity>
            </Text>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        padding: 20,
        backgroundColor: '#fceefc',
        paddingTop: 70,
    },
    header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 35,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 28,
    elevation: 6,
    shadowColor: '#780C60',
    shadowOpacity: 0.12,
    shadowRadius: 10,
},

textContainer: {
    flex: 1,
},

title: {
    fontSize: 30,
    fontWeight: '900',
    color: '#3c003c',
    lineHeight: 40,
},

titleHighlight: {
    color: '#780C60',
    fontSize: 34,
},

subtitle: {
    marginTop: 15,
    fontSize: 15,
    lineHeight: 24,
    color: '#666',
},

logoWrapper: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#FCE8F8',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    elevation: 5,
},

logo: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
},

gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 10,
},

card: {
    width: 155,
    height: 165,
    backgroundColor: '#FFF',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#F3C8E8',
    elevation: 5,
    shadowColor: '#780C60',
    shadowOpacity: 0.08,
    shadowRadius: 8,
},

selectedCard:{
    backgroundColor:'#780C60',
    borderColor:'#780C60',
    justifyContent:'center',
    alignItems:'center'
},

icon: {
    width: 55,
    height: 55,
    marginBottom: 18,
},

cardText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3c003c',
    textAlign: 'center',
},

selectedCardText: {
    color: '#fff',
},

footer: {
    flexDirection: 'row',
    marginTop: 15,
},

cancelButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#780C60',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    marginRight: 8,
},

cancelText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#780C60',
},

nextButton: {
    flex: 1,
    backgroundColor: '#780C60',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    elevation: 5,
},

disabledNextButton: {
    backgroundColor: '#D8A6D3',
},

nextText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
},

loginText: {
    marginTop: 35,
    textAlign: 'center',
    color: '#780C60',
    fontSize: 15,
},

loginLink: {
    fontWeight: '800',
    color: '#780C60',
    textDecorationLine: 'underline',
},

description: {
    marginTop: 10,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    color: '#fff',
},
});

export default BusinessSelectionIndex;
