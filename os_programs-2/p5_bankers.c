/* Assignment 5: Banker's Algorithm for deadlock avoidance
 * Inputs: processes, resource types, available, allocation, max
 * Outputs: safety check, safe sequence, request handling
 */
#include <stdio.h>
#include <stdlib.h>

#define MAX_P 10
#define MAX_R 10

static int P, R;
static int available[MAX_R];
static int max_need[MAX_P][MAX_R];
static int allocation[MAX_P][MAX_R];
static int need[MAX_P][MAX_R];

static void compute_need(void) {
    for (int i = 0; i < P; i++)
        for (int j = 0; j < R; j++)
            need[i][j] = max_need[i][j] - allocation[i][j];
}

static int is_safe(int *safe_seq) {
    int work[MAX_R];
    for (int j = 0; j < R; j++) work[j] = available[j];
    int finish[MAX_P] = {0};
    int count = 0;
    while (count < P) {
        int found = 0;
        for (int i = 0; i < P; i++) {
            if (finish[i]) continue;
            int ok = 1;
            for (int j = 0; j < R; j++)
                if (need[i][j] > work[j]) { ok = 0; break; }
            if (ok) {
                for (int j = 0; j < R; j++) work[j] += allocation[i][j];
                safe_seq[count++] = i;
                finish[i] = 1;
                found = 1;
            }
        }
        if (!found) return 0;
    }
    return 1;
}

static void print_state(void) {
    printf("\nPID\tAllocation\tMax\t\tNeed\n");
    for (int i = 0; i < P; i++) {
        printf("P%d\t", i);
        for (int j = 0; j < R; j++) printf("%d ", allocation[i][j]);
        printf("\t\t");
        for (int j = 0; j < R; j++) printf("%d ", max_need[i][j]);
        printf("\t\t");
        for (int j = 0; j < R; j++) printf("%d ", need[i][j]);
        printf("\n");
    }
    printf("Available: ");
    for (int j = 0; j < R; j++) printf("%d ", available[j]);
    printf("\n");
}

int main(void) {
    printf("Enter number of processes: ");
    if (scanf("%d", &P) != 1 || P < 1 || P > MAX_P) { printf("Invalid\n"); return 1; }
    printf("Enter number of resource types: ");
    if (scanf("%d", &R) != 1 || R < 1 || R > MAX_R) { printf("Invalid\n"); return 1; }

    printf("Enter available resources (%d values): ", R);
    for (int j = 0; j < R; j++) scanf("%d", &available[j]);

    for (int i = 0; i < P; i++) {
        printf("Process P%d - allocation (%d values): ", i, R);
        for (int j = 0; j < R; j++) scanf("%d", &allocation[i][j]);
        printf("Process P%d - max (%d values): ", i, R);
        for (int j = 0; j < R; j++) scanf("%d", &max_need[i][j]);
    }
    compute_need();
    print_state();

    int safe_seq[MAX_P];
    if (is_safe(safe_seq)) {
        printf("\nSystem is in SAFE state.\nSafe sequence: ");
        for (int i = 0; i < P; i++) printf("P%d ", safe_seq[i]);
        printf("\n");
    } else {
        printf("\nSystem is in UNSAFE state (deadlock possible).\n");
    }

    int choice;
    while (1) {
        printf("\n--- Banker's Algorithm ---\n");
        printf("1. Request resources\n");
        printf("2. Print current state\n");
        printf("3. Exit\n");
        printf("Choice: ");
        if (scanf("%d", &choice) != 1) break;
        if (choice == 3) break;
        if (choice == 2) { print_state(); continue; }
        if (choice != 1) { printf("Invalid\n"); continue; }

        int pid, req[MAX_R];
        printf("Enter process id (0-%d): ", P - 1);
        if (scanf("%d", &pid) != 1 || pid < 0 || pid >= P) {
            printf("Invalid process id\n"); continue;
        }
        printf("Enter request (%d values): ", R);
        for (int j = 0; j < R; j++) scanf("%d", &req[j]);

        int ok = 1;
        for (int j = 0; j < R; j++)
            if (req[j] > need[pid][j]) { ok = 0; break; }
        if (!ok) { printf("Error: request exceeds need\n"); continue; }
        for (int j = 0; j < R; j++)
            if (req[j] > available[j]) { ok = 0; break; }
        if (!ok) {
            printf("Resources not available, process must wait.\n");
            continue;
        }
        /* tentatively allocate */
        for (int j = 0; j < R; j++) {
            available[j]      -= req[j];
            allocation[pid][j] += req[j];
            need[pid][j]      -= req[j];
        }
        if (is_safe(safe_seq)) {
            printf("Request GRANTED. New safe sequence: ");
            for (int i = 0; i < P; i++) printf("P%d ", safe_seq[i]);
            printf("\n");
        } else {
            /* rollback */
            for (int j = 0; j < R; j++) {
                available[j]      += req[j];
                allocation[pid][j] -= req[j];
                need[pid][j]      += req[j];
            }
            printf("Request DENIED (would lead to unsafe state). Rolled back.\n");
        }
    }
    return 0;
}
