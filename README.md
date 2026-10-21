# Operating Systems Lab Programs

8 C programs covering all OS lab assignments.

## Files

| # | File | Topic |
|---|------|-------|
| 1 | p1_fork_exec.c | fork()/exec() simulating cp, grep, ls - with wait(), getpid(), exit() |
| 2 | p2_scheduling.c | CPU scheduling: FCFS, SJF, Round Robin, Priority |
| 3 | p3_ipc_pipes.c | IPC: parent-to-multiple-children pipes, output redirection, pipe chain |
| 4 | p4_reader_writer.c | Reader-Writer problem with pthreads (with vs without synchronization) |
| 5 | p5_bankers.c | Banker's algorithm for deadlock avoidance |
| 6 | p6_memory_alloc.c | Memory allocation: First Fit, Best Fit, Next Fit, Worst Fit |
| 7 | p7_page_replacement.c | Page replacement: FIFO, LRU, Optimal |
| 8 | p8_disk_scheduling.c | Disk scheduling: FIFO, SSTF, SCAN, C-SCAN |

## Compile

```bash
gcc -o p1 p1_fork_exec.c
gcc -o p2 p2_scheduling.c
gcc -o p3 p3_ipc_pipes.c
gcc -o p4 p4_reader_writer.c -lpthread
gcc -o p5 p5_bankers.c
gcc -o p6 p6_memory_alloc.c
gcc -o p7 p7_page_replacement.c
gcc -o p8 p8_disk_scheduling.c
```

All programs compile cleanly with `gcc -Wall -Wextra` (zero warnings).

## Run

Each program is menu-driven. Just run the binary and follow the prompts.

```bash
./p1
```
