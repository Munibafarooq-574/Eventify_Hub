// fyp-mobile/components/categoryvendorlisting/VendorSearchFilterBar.tsx
import React from "react";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { router, type Href } from "expo-router";
import { COLORS, scale } from "./theme";

interface VendorSearchFilterBarProps {
  searchQuery: string;
  onChangeSearchQuery: (text: string) => void;
  onSubmitSearch: () => void;
  onClearSearch: () => void;
  filterRoute?: Href; // default "/makeupfilter"
  extraFilterParams?: Record<string, string>;
}

export default function VendorSearchFilterBar({
  searchQuery,
  onChangeSearchQuery,
  onSubmitSearch,
  onClearSearch,
  filterRoute = "/makeupfilter",
  extraFilterParams = {},
}: VendorSearchFilterBarProps) {
  return (
    <View style={styles.searchContainer}>
      <Ionicons
        name="search"
        size={scale(19)}
        color={COLORS.placeholder}
        style={styles.searchIcon}
      />

      <TextInput
        placeholder="Search vendors..."
        style={styles.searchInput}
        placeholderTextColor={COLORS.placeholder}
        value={searchQuery}
        returnKeyType="search"
        onChangeText={onChangeSearchQuery}
        onSubmitEditing={onSubmitSearch}
      />

      {searchQuery.length > 0 && (
        <TouchableOpacity
          onPress={onClearSearch}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close-circle" size={scale(18)} color={COLORS.placeholder} />
        </TouchableOpacity>
      )}

      <View style={styles.searchDivider} />

      <TouchableOpacity
        testID="filter-button"
        onPress={() => {
          router.push({
            pathname: filterRoute,
            params: { name: searchQuery, ...extraFilterParams },
          } as Href);
        }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <MaterialIcons name="tune" size={scale(22)} color={COLORS.primary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: scale(26),
    paddingVertical: scale(12),
    paddingHorizontal: scale(16),
    marginBottom: scale(16),
    shadowColor: COLORS.primary,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    gap: scale(8),
  },
  searchIcon: {
    marginRight: scale(2),
  },
  searchInput: {
    flex: 1,
    fontSize: scale(14.5),
    color: COLORS.ink,
    paddingVertical: 0,
  },
  searchDivider: {
    width: 1,
    height: scale(20),
    backgroundColor: COLORS.border,
    marginHorizontal: scale(2),
  },
});