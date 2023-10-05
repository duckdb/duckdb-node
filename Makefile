all: build

./node_modules:
	npm install --ignore-scripts

build: ./node_modules
	./node_modules/.bin/node-pre-gyp build -j max --loglevel=silent

debug: ./node_modules
	./node_modules/.bin/node-pre-gyp build -j max --debug --verbose

clean:
	@rm -rf ./build
	rm -rf lib/binding/
	rm -f test/support/big.db-journal
	rm -rf ./node_modules/

complete_build:
	npm install

test:
	npm test

check: test

.PHONY: test clean build
