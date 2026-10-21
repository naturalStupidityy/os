/* Assignment 6: Memory allocation techniques
 * First Fit, Best Fit, Next Fit, Worst Fit
 */
#include <stdio.h>
#include <stdlib.h>

#define MAX 20

static int blocks[MAX];
static int processes[MAX];
static int n_blocks, n_proc;
static int allocation[MAX];
static int orig_blocks[MAX];

static void reset_blocks(void) {
    for (int i = 0; i < n_blocks; i++) blocks[i] = orig_blocks[i];
    for (int i = 0; i < n_proc;  i++) allocation[i] = -1;
}

static void first_fit(void) {
    reset_blocks();
    for (int i = 0; i < n_proc; i++)
        for (int j = 0; j < n_blocks; j++)
            if (blocks[j] >= processes[i]) {
                allocation[i] = j;
                blocks[j]    -= processes[i];
                break;
            }
}

static void best_fit(void) {
    reset_blocks();
    for (int i = 0; i < n_proc; i++) {
        int best = -1;
        for (int j = 0; j < n_blocks; j++)
            if (blocks[j] >= processes[i])
                if (best == -1 || blocks[j] < blocks[best])
                    best = j;
        if (best != -1) {
            allocation[i] = best;
            blocks[best] -= processes[i];
        }
    }
}

static void next_fit(void) {
    reset_blocks();
    int last = 0;
    for (int i = 0; i < n_proc; i++) {
        int found = -1;
        for (int k = 0; k < n_blocks; k++) {
            int j = (last + k) % n_blocks;
            if (blocks[j] >= processes[i]) { found = j; break; }
        }
        if (found != -1) {
            allocation[i]  = found;
            blocks[found] -= processes[i];
            last           = found;
        }
    }
}

static void worst_fit(void) {
    reset_blocks();
    for (int i = 0; i < n_proc; i++) {
        int worst = -1;
        for (int j = 0; j < n_blocks; j++)
            if (blocks[j] >= processes[i])
                if (worst == -1 || blocks[j] > blocks[worst])
                    worst = j;
        if (worst != -1) {
            allocation[i]  = worst;
            blocks[worst] -= processes[i];
        }
    }
}

static void print_result(void) {
    printf("\nProcess\tSize\tBlock Allocated\tRemaining in Block\n");
    for (int i = 0; i < n_proc; i++) {
        printf("%d\t%d\t", i + 1, processes[i]);
        if (allocation[i] != -1)
            printf("%d\t\t%d\n", allocation[i] + 1, blocks[allocation[i]]);
        else
            printf("Not Allocated\t-\n");
    }
    printf("\nFinal block sizes: ");
    for (int j = 0; j < n_blocks; j++) printf("%d ", blocks[j]);
    printf("\n");
}

int main(void) {
    printf("Enter number of memory blocks: ");
    if (scanf("%d", &n_blocks) != 1 || n_blocks < 1 || n_blocks > MAX) { printf("Invalid\n"); return 1; }
    printf("Enter block sizes: ");
    for (int i = 0; i < n_blocks; i++) {
        scanf("%d", &blocks[i]);
        orig_blocks[i] = blocks[i];
    }
    printf("Enter number of processes: ");
    if (scanf("%d", &n_proc) != 1 || n_proc < 1 || n_proc > MAX) { printf("Invalid\n"); return 1; }
    printf("Enter process sizes: ");
    for (int i = 0; i < n_proc; i++) scanf("%d", &processes[i]);

    int choice;
    while (1) {
        printf("\n--- Memory Allocation ---\n");
        printf("1. First Fit\n");
        printf("2. Best Fit\n");
        printf("3. Next Fit\n");
        printf("4. Worst Fit\n");
        printf("5. Exit\n");
        printf("Choice: ");
        if (scanf("%d", &choice) != 1) break;
        switch (choice) {
            case 1: first_fit();  print_result(); break;
            case 2: best_fit();   print_result(); break;
            case 3: next_fit();   print_result(); break;
            case 4: worst_fit();  print_result(); break;
            case 5: exit(0);
            default: printf("Invalid choice\n");
        }
    }
    return 0;
}
