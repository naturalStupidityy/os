/* Assignment 7: Page replacement algorithms
 * FIFO, LRU, Optimal
 */
#include <stdio.h>
#include <stdlib.h>

#define MAX 50

static int frames[MAX];
static int n_frames;

static void init_frames(void) {
    for (int i = 0; i < n_frames; i++) frames[i] = -1;
}

static int find_frame(int page) {
    for (int i = 0; i < n_frames; i++)
        if (frames[i] == page) return i;
    return -1;
}

static int find_empty(void) {
    for (int i = 0; i < n_frames; i++)
        if (frames[i] == -1) return i;
    return -1;
}

static void print_row(int page, int fault) {
    printf("%d\t", page);
    for (int i = 0; i < n_frames; i++) {
        if (frames[i] == -1) printf("-\t");
        else                 printf("%d\t", frames[i]);
    }
    printf("%s\n", fault ? "Fault" : "Hit");
}

static void fifo(int ref[], int n) {
    init_frames();
    int next = 0, faults = 0;
    printf("\nPage\t");
    for (int i = 0; i < n_frames; i++) printf("Frame%d\t", i + 1);
    printf("Status\n");
    for (int i = 0; i < n; i++) {
        int fault = 0;
        if (find_frame(ref[i]) == -1) {
            fault  = 1;
            faults++;
            int empty = find_empty();
            int pos   = (empty != -1) ? empty : (next % n_frames);
            frames[pos] = ref[i];
            if (empty == -1) next++;
        }
        print_row(ref[i], fault);
    }
    printf("Total page faults: %d\n", faults);
    printf("Hit ratio: %.2f%%\n", (float)(n - faults) / n * 100);
}

static void lru(int ref[], int n) {
    init_frames();
    int last_used[MAX];
    for (int i = 0; i < n_frames; i++) last_used[i] = -1;
    int faults = 0, time = 0;
    printf("\nPage\t");
    for (int i = 0; i < n_frames; i++) printf("Frame%d\t", i + 1);
    printf("Status\n");
    for (int i = 0; i < n; i++) {
        int fault = 0;
        int pos   = find_frame(ref[i]);
        if (pos != -1) {
            last_used[pos] = time++;
        } else {
            fault  = 1;
            faults++;
            int empty = find_empty();
            if (empty != -1) {
                frames[empty]     = ref[i];
                last_used[empty]  = time++;
            } else {
                int lru_pos = 0;
                for (int j = 1; j < n_frames; j++)
                    if (last_used[j] < last_used[lru_pos]) lru_pos = j;
                frames[lru_pos]    = ref[i];
                last_used[lru_pos] = time++;
            }
        }
        print_row(ref[i], fault);
    }
    printf("Total page faults: %d\n", faults);
    printf("Hit ratio: %.2f%%\n", (float)(n - faults) / n * 100);
}

static void optimal(int ref[], int n) {
    init_frames();
    int faults = 0;
    printf("\nPage\t");
    for (int i = 0; i < n_frames; i++) printf("Frame%d\t", i + 1);
    printf("Status\n");
    for (int i = 0; i < n; i++) {
        int fault = 0;
        if (find_frame(ref[i]) == -1) {
            fault  = 1;
            faults++;
            int empty = find_empty();
            if (empty != -1) {
                frames[empty] = ref[i];
            } else {
                int victim = 0, farthest = -1;
                for (int j = 0; j < n_frames; j++) {
                    int k;
                    for (k = i + 1; k < n; k++)
                        if (frames[j] == ref[k]) break;
                    if (k > farthest) { farthest = k; victim = j; }
                }
                frames[victim] = ref[i];
            }
        }
        print_row(ref[i], fault);
    }
    printf("Total page faults: %d\n", faults);
    printf("Hit ratio: %.2f%%\n", (float)(n - faults) / n * 100);
}

int main(void) {
    int n;
    printf("Enter number of frames: ");
    if (scanf("%d", &n_frames) != 1 || n_frames < 1 || n_frames > MAX) {
        printf("Invalid\n"); return 1;
    }
    printf("Enter length of reference string: ");
    if (scanf("%d", &n) != 1 || n < 1 || n > MAX) { printf("Invalid\n"); return 1; }
    int ref[MAX];
    printf("Enter reference string: ");
    for (int i = 0; i < n; i++) scanf("%d", &ref[i]);

    int choice;
    while (1) {
        printf("\n--- Page Replacement ---\n");
        printf("1. FIFO\n");
        printf("2. LRU\n");
        printf("3. Optimal\n");
        printf("4. Exit\n");
        printf("Choice: ");
        if (scanf("%d", &choice) != 1) break;
        switch (choice) {
            case 1: fifo(ref, n);     break;
            case 2: lru(ref, n);      break;
            case 3: optimal(ref, n);  break;
            case 4: exit(0);
            default: printf("Invalid choice\n");
        }
    }
    return 0;
}
