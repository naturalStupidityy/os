/* Assignment 8: Disk scheduling algorithms
 * FIFO, SSTF, SCAN, C-SCAN
 */
#include <stdio.h>
#include <stdlib.h>

#define MAX 50

static int requests[MAX];
static int n;
static int head;
static int disk_size;

static void fifo(void) {
    int total = 0, cur = head;
    printf("\nOrder: %d", cur);
    for (int i = 0; i < n; i++) {
        total += abs(requests[i] - cur);
        cur    = requests[i];
        printf(" -> %d", cur);
    }
    printf("\nTotal seek distance: %d\n", total);
    printf("Average seek:        %.2f\n", (float)total / n);
}

static void sstf(void) {
    int done[MAX] = {0};
    int total = 0, cur = head;
    printf("\nOrder: %d", cur);
    for (int k = 0; k < n; k++) {
        int best = -1, best_dist = 1 << 30;
        for (int i = 0; i < n; i++) {
            if (!done[i]) {
                int d = abs(requests[i] - cur);
                if (d < best_dist) { best_dist = d; best = i; }
            }
        }
        done[best] = 1;
        total     += best_dist;
        cur        = requests[best];
        printf(" -> %d", cur);
    }
    printf("\nTotal seek distance: %d\n", total);
    printf("Average seek:        %.2f\n", (float)total / n);
}

static void scan(void) {
    int sorted[MAX];
    for (int i = 0; i < n; i++) sorted[i] = requests[i];
    for (int i = 0; i < n - 1; i++)
        for (int j = 0; j < n - i - 1; j++)
            if (sorted[j] > sorted[j+1]) {
                int t = sorted[j]; sorted[j] = sorted[j+1]; sorted[j+1] = t;
            }

    int total = 0, cur = head;
    printf("\nOrder: %d", cur);

    int i = 0;
    while (i < n && sorted[i] < head) i++;
    /* go down (toward 0) */
    for (int j = i - 1; j >= 0; j--) {
        total += abs(sorted[j] - cur);
        cur    = sorted[j];
        printf(" -> %d", cur);
    }
    /* hit 0 */
    if (cur != 0) {
        total += cur;
        cur    = 0;
        printf(" -> %d", cur);
    }
    /* go up */
    for (int j = i; j < n; j++) {
        total += abs(sorted[j] - cur);
        cur    = sorted[j];
        printf(" -> %d", cur);
    }
    printf("\nTotal seek distance: %d\n", total);
    printf("Average seek:        %.2f\n", (float)total / n);
}

static void cscan(void) {
    int sorted[MAX];
    for (int i = 0; i < n; i++) sorted[i] = requests[i];
    for (int i = 0; i < n - 1; i++)
        for (int j = 0; j < n - i - 1; j++)
            if (sorted[j] > sorted[j+1]) {
                int t = sorted[j]; sorted[j] = sorted[j+1]; sorted[j+1] = t;
            }

    int total = 0, cur = head;
    printf("\nOrder: %d", cur);

    int i = 0;
    while (i < n && sorted[i] < head) i++;
    /* go up to disk_size */
    for (int j = i; j < n; j++) {
        total += abs(sorted[j] - cur);
        cur    = sorted[j];
        printf(" -> %d", cur);
    }
    /* hit disk_size */
    if (cur != disk_size) {
        total += abs(disk_size - cur);
        cur    = disk_size;
        printf(" -> %d", cur);
    }
    /* jump to 0 */
    total += cur;
    cur    = 0;
    printf(" -> %d", cur);
    /* go up from 0 */
    for (int j = 0; j < i; j++) {
        total += abs(sorted[j] - cur);
        cur    = sorted[j];
        printf(" -> %d", cur);
    }
    printf("\nTotal seek distance: %d\n", total);
    printf("Average seek:        %.2f\n", (float)total / n);
}

int main(void) {
    printf("Enter number of requests: ");
    if (scanf("%d", &n) != 1 || n < 1 || n > MAX) { printf("Invalid\n"); return 1; }
    printf("Enter request queue: ");
    for (int i = 0; i < n; i++) scanf("%d", &requests[i]);
    printf("Enter initial head position: ");
    if (scanf("%d", &head) != 1) { printf("Invalid\n"); return 1; }
    printf("Enter disk size (max cylinder): ");
    if (scanf("%d", &disk_size) != 1) { printf("Invalid\n"); return 1; }

    int choice;
    while (1) {
        printf("\n--- Disk Scheduling ---\n");
        printf("1. FIFO\n");
        printf("2. SSTF\n");
        printf("3. SCAN\n");
        printf("4. C-SCAN\n");
        printf("5. Exit\n");
        printf("Choice: ");
        if (scanf("%d", &choice) != 1) break;
        switch (choice) {
            case 1: fifo();  break;
            case 2: sstf();  break;
            case 3: scan();  break;
            case 4: cscan(); break;
            case 5: exit(0);
            default: printf("Invalid choice\n");
        }
    }
    return 0;
}
