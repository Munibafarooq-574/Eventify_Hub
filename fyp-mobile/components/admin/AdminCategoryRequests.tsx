import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { AdminColors } from "../../constants/AdminColors";

import {
  AdminCategoryOption,
  AdminCategoryRequest,
  CategoryRequestStatus,
} from "../../types/admin.types";

import adminGetCategoryRequests from "../../services/admin/adminGetCategoryRequests";

import adminReviewCategoryRequest from "../../services/admin/adminReviewCategoryRequest";

import getAllCategories from "../../services/getAllCategories";

type FilterType =
  | "ALL"
  | CategoryRequestStatus;

const FILTERS: FilterType[] = [
  "ALL",
  "PENDING",
  "REJECTED",
  "MERGED",
];

export default function AdminCategoryRequests() {
  const [requests, setRequests] = useState<
    AdminCategoryRequest[]
  >([]);

  const [categories, setCategories] = useState<
    AdminCategoryOption[]
  >([]);

  const [filter, setFilter] =
    useState<FilterType>("PENDING");

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [processingId, setProcessingId] =
    useState<string | null>(null);

  const [rejectModalVisible, setRejectModalVisible] =
    useState(false);

  const [mergeModalVisible, setMergeModalVisible] =
    useState(false);

  const [selectedRequest, setSelectedRequest] =
    useState<AdminCategoryRequest | null>(null);

  const [adminNote, setAdminNote] =
    useState("");

  const [selectedMergeCategoryId, setSelectedMergeCategoryId] =
    useState<string | null>(null);

  const loadRequests = useCallback(
    async (showLoader = true) => {
      try {
        if (showLoader) {
          setLoading(true);
        }

        const status =
          filter === "ALL"
            ? undefined
            : filter;

        const response =
          await adminGetCategoryRequests(
            status
          );

        setRequests(response);
      } catch (error: any) {
        const message =
          error?.response?.data?.message;

        Alert.alert(
          "Unable to Load",
          Array.isArray(message)
            ? message.join("\n")
            : message ||
                "Unable to load category requests."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filter]
  );

  const loadCategories =
    useCallback(async () => {
      try {
        const response =
          await getAllCategories();

        setCategories(
          Array.isArray(response)
            ? response
            : []
        );
      } catch (error) {
        console.log(
          "Unable to load categories:",
          error
        );
      }
    }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadRequests(false);
    loadCategories();
  };

  const openRejectModal = (
    request: AdminCategoryRequest
  ) => {
    setSelectedRequest(request);
    setAdminNote("");
    setRejectModalVisible(true);
  };

  const openMergeModal = (
    request: AdminCategoryRequest
  ) => {
    setSelectedRequest(request);
    setSelectedMergeCategoryId(null);
    setAdminNote("");
    setMergeModalVisible(true);
  };

  const handleReject = async () => {
    if (!selectedRequest) {
      return;
    }

    try {
      setProcessingId(
        selectedRequest._id
      );

      await adminReviewCategoryRequest(
        selectedRequest._id,
        {
          action: "REJECT",
          adminNote:
            adminNote.trim() ||
            undefined,
        }
      );

      setRejectModalVisible(false);
      setSelectedRequest(null);
      setAdminNote("");

      Alert.alert(
        "Request Rejected",
        "The category request has been rejected."
      );

      await loadRequests(false);
    } catch (error: any) {
      const message =
        error?.response?.data?.message;

      Alert.alert(
        "Reject Failed",
        Array.isArray(message)
          ? message.join("\n")
          : message ||
              "Unable to reject request."
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleMerge = async () => {
    if (!selectedRequest) {
      return;
    }

    if (!selectedMergeCategoryId) {
      Alert.alert(
        "Select Category",
        "Please select an existing category to merge this request with."
      );
      return;
    }

    try {
      setProcessingId(
        selectedRequest._id
      );

      await adminReviewCategoryRequest(
        selectedRequest._id,
        {
          action: "MERGE",
          mergeCategoryId:
            selectedMergeCategoryId,
          adminNote:
            adminNote.trim() ||
            undefined,
        }
      );

      setMergeModalVisible(false);

      setSelectedRequest(null);

      setSelectedMergeCategoryId(
        null
      );

      setAdminNote("");

      Alert.alert(
        "Request Merged",
        "The request has been merged with the selected category."
      );

      await loadRequests(false);
    } catch (error: any) {
      const message =
        error?.response?.data?.message;

      Alert.alert(
        "Merge Failed",
        Array.isArray(message)
          ? message.join("\n")
          : message ||
              "Unable to merge category request."
      );
    } finally {
      setProcessingId(null);
    }
  };

  const pendingCount = useMemo(
    () =>
      requests.filter(
        (item) =>
          item.status === "PENDING"
      ).length,
    [requests]
  );

  const getStatusStyle = (
    status: CategoryRequestStatus
  ) => {
    switch (status) {
      case "PENDING":
        return {
          backgroundColor: "#FFF5D9",
          color: "#9A6800",
        };

      case "REJECTED":
        return {
          backgroundColor: "#FFE5E5",
          color: "#B3261E",
        };

      case "MERGED":
        return {
          backgroundColor: "#E9E4FF",
          color: "#654EA3",
        };

      case "APPROVED":
        return {
          backgroundColor: "#E1F5E8",
          color: "#237A43",
        };

      default:
        return {
          backgroundColor: "#EEEEEE",
          color: "#555555",
        };
    }
  };

  const renderRequest = ({
    item,
  }: {
    item: AdminCategoryRequest;
  }) => {
    const statusStyle =
      getStatusStyle(item.status);

    const processing =
      processingId === item._id;

    return (
      <View style={styles.requestCard}>
        <View style={styles.cardTop}>
          <View style={styles.categoryIcon}>
            <Ionicons
              name="pricetag-outline"
              size={22}
              color={AdminColors.primary}
            />
          </View>

          <View style={styles.titleContainer}>
            <Text
              style={styles.categoryName}
              numberOfLines={1}
            >
              {item.requestedName}
            </Text>

            {item.createdAt ? (
              <Text style={styles.date}>
                {new Date(
                  item.createdAt
                ).toLocaleDateString()}
              </Text>
            ) : null}
          </View>

          <View
            style={[
              styles.statusChip,
              {
                backgroundColor:
                  statusStyle.backgroundColor,
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color:
                    statusStyle.color,
                },
              ]}
            >
              {item.status}
            </Text>
          </View>
        </View>

        <Text style={styles.descriptionLabel}>
          Service Description
        </Text>

        <Text style={styles.description}>
          {item.description}
        </Text>

        {item.adminNote ? (
          <View style={styles.noteBox}>
            <Text style={styles.noteTitle}>
              Admin Note
            </Text>

            <Text style={styles.noteText}>
              {item.adminNote}
            </Text>
          </View>
        ) : null}

        {item.status === "PENDING" && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.rejectButton}
              disabled={processing}
              onPress={() =>
                openRejectModal(item)
              }
            >
              <Ionicons
                name="close-circle-outline"
                size={18}
                color="#B3261E"
              />

              <Text
                style={
                  styles.rejectButtonText
                }
              >
                Reject
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.mergeButton}
              disabled={processing}
              onPress={() =>
                openMergeModal(item)
              }
            >
              {processing ? (
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />
              ) : (
                <>
                  <Ionicons
                    name="git-merge-outline"
                    size={18}
                    color="#FFFFFF"
                  />

                  <Text
                    style={
                      styles.mergeButtonText
                    }
                  >
                    Merge
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color={AdminColors.primary}
        />

        <Text style={styles.loadingText}>
          Loading category requests...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.summaryCard}>
        <View>
          <Text style={styles.summaryTitle}>
            Category Requests
          </Text>

          <Text style={styles.summarySubtitle}>
            Review new service category
            requests from vendors.
          </Text>
        </View>

        <View style={styles.pendingBadge}>
          <Text
            style={
              styles.pendingBadgeValue
            }
          >
            {pendingCount}
          </Text>

          <Text
            style={
              styles.pendingBadgeLabel
            }
          >
            Pending
          </Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.filters
        }
      >
        {FILTERS.map((item) => {
          const active =
            filter === item;

          return (
            <Pressable
              key={item}
              style={[
                styles.filterChip,
                active &&
                  styles.filterChipActive,
              ]}
              onPress={() =>
                setFilter(item)
              }
            >
              <Text
                style={[
                  styles.filterText,
                  active &&
                    styles.filterTextActive,
                ]}
              >
                {item}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <FlatList
        data={requests}
        keyExtractor={(item) =>
          item._id
        }
        renderItem={renderRequest}
        contentContainerStyle={
          requests.length === 0
            ? styles.emptyList
            : styles.list
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Ionicons
              name="file-tray-outline"
              size={42}
              color={
                AdminColors.textMuted
              }
            />

            <Text style={styles.emptyTitle}>
              No Category Requests
            </Text>

            <Text style={styles.emptyText}>
              There are no requests for
              this filter.
            </Text>
          </View>
        }
      />

      {/* Reject Modal */}

      <Modal
        visible={rejectModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setRejectModalVisible(false)
        }
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              Reject Category Request
            </Text>

            <Text
              style={styles.modalSubtitle}
            >
              {selectedRequest?.requestedName}
            </Text>

            <TextInput
              value={adminNote}
              onChangeText={setAdminNote}
              placeholder="Reason for rejection (optional)"
              placeholderTextColor="#999"
              multiline
              textAlignVertical="top"
              style={styles.noteInput}
            />

            <View
              style={styles.modalActions}
            >
              <TouchableOpacity
                style={
                  styles.modalCancelButton
                }
                onPress={() =>
                  setRejectModalVisible(
                    false
                  )
                }
              >
                <Text
                  style={
                    styles.modalCancelText
                  }
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={
                  styles.modalRejectButton
                }
                onPress={handleReject}
              >
                <Text
                  style={
                    styles.modalRejectText
                  }
                >
                  Reject
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Merge Modal */}

      <Modal
        visible={mergeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setMergeModalVisible(false)
        }
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              styles.mergeModalCard,
            ]}
          >
            <Text style={styles.modalTitle}>
              Merge Category Request
            </Text>

            <Text
              style={styles.modalSubtitle}
            >
              Request:{" "}
              {selectedRequest?.requestedName}
            </Text>

            <Text
              style={
                styles.selectCategoryLabel
              }
            >
              Select Existing Category
            </Text>

            <ScrollView
              style={
                styles.categoriesList
              }
              showsVerticalScrollIndicator={
                false
              }
            >
              {categories.map(
                (category) => {
                  const selected =
                    selectedMergeCategoryId ===
                    category._id;

                  return (
                    <TouchableOpacity
                      key={category._id}
                      style={[
                        styles.categoryOption,
                        selected &&
                          styles.categoryOptionSelected,
                      ]}
                      onPress={() =>
                        setSelectedMergeCategoryId(
                          category._id
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.categoryOptionText,
                          selected &&
                            styles.categoryOptionTextSelected,
                        ]}
                      >
                        {category.name}
                      </Text>

                      {selected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={21}
                          color={
                            AdminColors.primary
                          }
                        />
                      )}
                    </TouchableOpacity>
                  );
                }
              )}
            </ScrollView>

            <TextInput
              value={adminNote}
              onChangeText={setAdminNote}
              placeholder="Admin note (optional)"
              placeholderTextColor="#999"
              multiline
              style={styles.mergeNoteInput}
            />

            <View
              style={styles.modalActions}
            >
              <TouchableOpacity
                style={
                  styles.modalCancelButton
                }
                onPress={() =>
                  setMergeModalVisible(
                    false
                  )
                }
              >
                <Text
                  style={
                    styles.modalCancelText
                  }
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalMergeButton,
                  !selectedMergeCategoryId &&
                    styles.disabledButton,
                ]}
                disabled={
                  !selectedMergeCategoryId
                }
                onPress={handleMerge}
              >
                <Text
                  style={
                    styles.modalMergeText
                  }
                >
                  Confirm Merge
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  loadingContainer: {
    flex: 1,
    minHeight: 400,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: AdminColors.textMuted,
  },

  summaryCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: AdminColors.card,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
  },

  summaryTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: AdminColors.text,
  },

  summarySubtitle: {
    marginTop: 4,
    maxWidth: 230,
    fontSize: 12,
    lineHeight: 18,
    color: AdminColors.textMuted,
  },

  pendingBadge: {
    minWidth: 64,
    borderRadius: 14,
    backgroundColor: "#FFF5D9",
    paddingVertical: 8,
    alignItems: "center",
  },

  pendingBadgeValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#9A6800",
  },

  pendingBadgeLabel: {
    marginTop: 1,
    fontSize: 10,
    fontWeight: "600",
    color: "#9A6800",
  },

  filters: {
    paddingBottom: 14,
  },

  filterChip: {
    paddingHorizontal: 15,
    paddingVertical: 9,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: AdminColors.card,
    borderWidth: 1,
    borderColor: "#E7E7E7",
  },

  filterChipActive: {
    backgroundColor: AdminColors.primary,
    borderColor: AdminColors.primary,
  },

  filterText: {
    fontSize: 12,
    fontWeight: "600",
    color: AdminColors.textMuted,
  },

  filterTextActive: {
    color: "#FFFFFF",
  },

  list: {
    paddingBottom: 30,
  },

  requestCard: {
    backgroundColor: AdminColors.card,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },

  cardTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  categoryIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#F6EAF4",
    justifyContent: "center",
    alignItems: "center",
  },

  titleContainer: {
    flex: 1,
    marginLeft: 11,
  },

  categoryName: {
    fontSize: 16,
    fontWeight: "700",
    color: AdminColors.text,
  },

  date: {
    marginTop: 3,
    fontSize: 11,
    color: AdminColors.textMuted,
  },

  statusChip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
  },

  statusText: {
    fontSize: 9,
    fontWeight: "800",
  },

  descriptionLabel: {
    marginTop: 15,
    fontSize: 11,
    fontWeight: "700",
    color: AdminColors.textMuted,
  },

  description: {
    marginTop: 5,
    fontSize: 13,
    lineHeight: 20,
    color: AdminColors.text,
  },

  noteBox: {
    marginTop: 12,
    backgroundColor: "#F7F7F7",
    borderRadius: 12,
    padding: 11,
  },

  noteTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: AdminColors.text,
  },

  noteText: {
    marginTop: 3,
    fontSize: 12,
    lineHeight: 18,
    color: AdminColors.textMuted,
  },

  actions: {
    flexDirection: "row",
    marginTop: 16,
  },

  rejectButton: {
    flex: 1,
    minHeight: 43,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F1B7B4",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },

  rejectButtonText: {
    marginLeft: 5,
    fontSize: 12,
    fontWeight: "700",
    color: "#B3261E",
  },

  mergeButton: {
    flex: 1,
    minHeight: 43,
    borderRadius: 12,
    backgroundColor: AdminColors.primary,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
  },

  mergeButtonText: {
    marginLeft: 5,
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  emptyList: {
    flexGrow: 1,
    justifyContent: "center",
  },

  emptyCard: {
    alignItems: "center",
    paddingVertical: 50,
  },

  emptyTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "700",
    color: AdminColors.text,
  },

  emptyText: {
    marginTop: 5,
    fontSize: 12,
    color: AdminColors.textMuted,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 20,
  },

  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
  },

  mergeModalCard: {
    maxHeight: "80%",
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: AdminColors.text,
  },

  modalSubtitle: {
    marginTop: 5,
    marginBottom: 15,
    fontSize: 13,
    color: AdminColors.textMuted,
  },

  noteInput: {
    minHeight: 110,
    borderWidth: 1,
    borderColor: "#E1E1E1",
    backgroundColor: "#FAFAFA",
    borderRadius: 13,
    padding: 12,
    fontSize: 13,
  },

  mergeNoteInput: {
    minHeight: 70,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#E1E1E1",
    backgroundColor: "#FAFAFA",
    borderRadius: 13,
    padding: 12,
    fontSize: 13,
    textAlignVertical: "top",
  },

  selectCategoryLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: AdminColors.text,
    marginBottom: 8,
  },

  categoriesList: {
    maxHeight: 250,
  },

  categoryOption: {
    minHeight: 48,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: "#EBEBEB",
    borderRadius: 12,
    marginBottom: 7,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  categoryOptionSelected: {
    borderColor: AdminColors.primary,
    backgroundColor: "#F8EDF6",
  },

  categoryOptionText: {
    fontSize: 13,
    fontWeight: "600",
    color: AdminColors.text,
  },

  categoryOptionTextSelected: {
    color: AdminColors.primary,
  },

  modalActions: {
    flexDirection: "row",
    marginTop: 16,
  },

  modalCancelButton: {
    flex: 1,
    minHeight: 46,
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },

  modalCancelText: {
    color: AdminColors.text,
    fontWeight: "700",
  },

  modalRejectButton: {
    flex: 1,
    minHeight: 46,
    backgroundColor: "#B3261E",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },

  modalRejectText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  modalMergeButton: {
    flex: 1,
    minHeight: 46,
    backgroundColor: AdminColors.primary,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },

  modalMergeText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  disabledButton: {
    opacity: 0.45,
  },
});