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

using std::cout;

Board myBoard(15, 15);

uint8_t currentInput = -1;

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

int main() {
    setup();
    while (1) {
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
        }
        myBoard.moveSnake(currentInput);
        system("clear");
        myBoard.print();
    }
    return 0;
}
