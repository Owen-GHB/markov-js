# Markov Chain Text Generator

This is a simple command-line tool for generating text using a Markov chain model. The model is built from a given corpus of text and can be used to generate new text that mimics the style of the original corpus.

## Usage

To use the tool, you can run the `markov-cli.js` script from the command line.

### Training a model

To train a new model, you need to provide a path to a text file to be used as the corpus.

```bash
node markov-cli.js train --corpus data/corpus/sample.txt --model my_model.json
```

This will create a new model file named `my_model.json`.

### Generating text

To generate text from a trained model, you need to provide the path to the model file and the desired length of the generated text.

```bash
node markov-cli.js generate --model my_model.json --length 100
```

This will generate a text of 100 words based on the provided model.
