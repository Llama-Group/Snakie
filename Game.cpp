//
//  Copyright © 2016 Project Llama. All rights reserved.
//
//  Licensed under the Apache License, Version 2.0 (the "License");
//  you may not use this file except in compliance with the License.
//  You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
//  Unless required by applicable law or agreed to in writing, software
//  distributed under the License is distributed on an "AS IS" BASIS,
//  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  See the License for the specific language governing permissions and
//  limitations under the License.
//

#include <unistd.h>
#include <termios.h>

#include <chrono>
#include <iostream>
#include <thread>

#include <Board.h>
#include <QLearning.h>

using std::cout;

using hamster::QLearning;

Board myBoard(15, 15);

uint8_t currentInput = 100;

char getch() {
    char buf = 0;
    struct termios old = {0};
    if (tcgetattr(0, &old) < 0) {
        perror("tcsetattr()");
    }
    old.c_lflag &= ~ICANON;
    old.c_lflag &= ~ECHO;
    old.c_cc[VMIN] = 1;
    old.c_cc[VTIME] = 0;
    if (tcsetattr(0, TCSANOW, &old) < 0) {
        perror("tcsetattr ICANON");
    }
    if (read(0, &buf, 1) < 0) {
        perror ("read()");
    }
    old.c_lflag |= ICANON;
    old.c_lflag |= ECHO;
    if (tcsetattr(0, TCSADRAIN, &old) < 0) {
        perror ("tcsetattr ~ICANON");
    }
    return (buf);
}

void setup() {    
    myBoard.setSnake(13, 7, Up);
    myBoard.setFood(1, 7);
    system("clear");
    myBoard.print();
}

void gameover() {
    exit(0);
}

#include <random>

int main() {
    setup();
    QLearning ql({{10, 10, 10, 10},
                  {1,  1,  1,  1},
                  {0,  0,  0,  0}});
    while (1) {
        /* Human interaction.
        switch (getch()) {
            case 'w':
                currentInput = Up;
                break;
            case 's':
                currentInput = Down;
                break;
            case 'a':
                currentInput = Left;
                break;
            case 'd':
                currentInput = Right;
                break;
            default:
                break;
        }*/
        std::random_device mRandomDevice;
        std::uniform_int_distribution<int> mActionDistribution(Up, Right);

        int count = 0;
        uint8_t move;
        do {
            move = mActionDistribution(mRandomDevice);
            count++;
        } while (!myBoard.isValidMove(Directions[move]) || count <= 4);
        currentInput = move;

        switch (myBoard.moveSnake(currentInput)) {
            case -1:
                gameover();
                break;
            case 0:
                myBoard.appendSnake();
                myBoard.setFood();
                break;
            default:
                break;
        }
        system("clear");
        myBoard.print();
    }
    return 0;
}
